// app.js

let currentSession = null; // { id, startedAt, timerId }

let manualRunActive = false;
let didSaveDL = false;
let didSaveUL = false;



// ---- CSV + session helpers ----
const EXPORT_BASE = '/.netlify/functions/export-results'; // change to '/api/msak/export-results' if rehosted

const SESSION_KEY = 'msakActiveSession';
function saveSessionState() { try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession)); } catch {} }
function loadSessionState() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
function clearSessionState(){ try { localStorage.removeItem(SESSION_KEY); } catch {} }

function downloadCsvForSession(sessionId){
  const a = document.createElement('a');
  a.href = `${EXPORT_BASE}?session_id=${encodeURIComponent(sessionId)}`;
  a.download = `msak_results_${sessionId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function maybeTriggerCsvExport(force=false){
  const s = currentSession || loadSessionState();
  if (!s || s.didExport) return;
  const sid = s.subId;
  if (!sid) return;

  const expTs = s.expiresAt ? new Date(s.expiresAt).getTime() : 0;
  const now = Date.now();
  const graceMs = 90_000;

  if (force || now >= expTs + graceMs) {
    s.didExport = true;
    saveSessionState();
    try { await unsubscribe(); } catch {}
    downloadCsvForSession(sid);
    clearSessionState();
    // Also clear any timers we own
    if (s.countdownTimerId) clearInterval(s.countdownTimerId);
    if (s.timerId) clearTimeout(s.timerId);
  }
}

function ensureExportWatcher(){
  clearInterval(ensureExportWatcher._iv);
  ensureExportWatcher._iv = setInterval(() => maybeTriggerCsvExport(false), 30_000);
  // window.addEventListener('visibilitychange', () => { if (!document.hidden) maybeTriggerCsvExport(false); });
  // window.addEventListener('focus', () => maybeTriggerCsvExport(false));
   if (!ensureExportWatcher._bound) {
  window.addEventListener('visibilitychange', () => {
     if (!document.hidden) maybeTriggerCsvExport(false);
   });
   window.addEventListener('focus', () => maybeTriggerCsvExport(false));
   ensureExportWatcher._bound = true;
 }
}



// Track per-test completion (download + upload finals)
let pendingFinal = { download: false, upload: false };

function markFinal(direction) {
  pendingFinal[direction] = true;
  if (pendingFinal.download && pendingFinal.upload) {
    // one “test run” completed
    pendingFinal = { download: false, upload: false };
    if (currentSession) {
      currentSession.runCount = (currentSession.runCount || 0) + 1;
      dbg.runCount.textContent = String(currentSession.runCount);
    }
  }
}


// guard so a given push SID can’t run twice in parallel
const activePushRuns = new Set();


const dbg = {
  local: document.getElementById('dbg-active-local'),
  server: document.getElementById('dbg-active-server'),
  subId: document.getElementById('dbg-sub-id'),
  runCount: document.getElementById('dbg-run-count'),
  expiresAt: document.getElementById('dbg-expires-at'),
  countdown: document.getElementById('dbg-countdown')
};



const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const resultDisplay = document.getElementById('resultDisplay');
const subscribeBtn = document.getElementById('subscribeBtn');
const unsubscribeBtn = document.getElementById('unsubscribeBtn');
const runBtn = document.getElementById('runTestBtn');


function extractGoodputBps(r) {
  if (!r) return null;
  if (typeof r.goodput_bps === 'number') return r.goodput_bps;      // already bps
  if (typeof r.goodput === 'number')     return Math.round(r.goodput * 1e6); // Mbps → bps
  return null;
}



async function ensureSubscription() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const pub = await getVapidPublicKey(); // you already have this
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pub)
    });
  }
  // remember endpoint for unsubscribe fallback
  if (sub?.endpoint) localStorage.setItem('lastEndpoint', sub.endpoint);
  return sub;
}

function toServerSubscription(sub) {
  const json = sub?.toJSON?.() || {};
  return {
    endpoint: sub?.endpoint,
    p256dh: json?.keys?.p256dh,
    auth: json?.keys?.auth,
    expiration_time: sub?.expirationTime ?? null
  };
}


async function updateDebugLocal() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  dbg.local.textContent = sub ? 'yes' : 'no';
  dbg.subId.textContent = currentSession?.subId ?? '—';
  dbg.expiresAt.textContent = currentSession?.expiresAt ?? '—';
}

async function updateDebugServer() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) { dbg.server.textContent = 'no'; return; }
  try {
    const r = await fetch('/.netlify/functions/check-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint })
    });
    const data = await r.json();
    dbg.server.textContent = data.found && !data.expired ? 'yes' : 'no (expired)';

    if (data.id && !currentSession?.subId) {
      currentSession = currentSession || {};
      currentSession.subId = data.id;
      dbg.subId.textContent = String(data.id);
      saveSessionState();
    }

    if (data.app_expires_at && !currentSession?.expiresAt) {
      currentSession = currentSession || {};
      currentSession.expiresAt = data.app_expires_at;
      dbg.expiresAt.textContent = data.app_expires_at;
      startCountdown();
      ensureExportWatcher();
      saveSessionState();
    }
  } catch {
    dbg.server.textContent = 'error';
  }
}



function startCountdown(){
  if (!currentSession?.expiresAt) return;
  const el = dbg.countdown || document.getElementById('countdown') || { textContent: '' };
  // const el = document.getElementById('countdown'); // or dbg.countdown if that's your element
  // const el = $('#countdown');
  clearInterval(currentSession.countdownTimerId);

  const tick = () => {
    const ms = new Date(currentSession.expiresAt) - new Date();
    if (ms <= 0) {
      el.textContent = ' (expired)';
      clearInterval(currentSession.countdownTimerId);
      // Schedule export via grace; this handles the “just expired” case
      setTimeout(() => maybeTriggerCsvExport(true), 90_000);
      return;
    }
    const m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
    el.textContent = ` (${m}m ${s}s)`;
  };
  tick();
  currentSession.countdownTimerId = setInterval(tick, 1000);
}


function clearCountdown() {
  if (currentSession?.countdownTimerId) {
    clearInterval(currentSession.countdownTimerId);
    currentSession.countdownTimerId = null;
  }
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  logEl.textContent += line;
  logEl.scrollTop = logEl.scrollHeight;
}

function updateStatus(text) {
  statusEl.textContent = text;
}

function setButtons({ subscribed, blocked, supported }) {
  if (!supported) {
    updateStatus('push not supported');
    subscribeBtn?.setAttribute('disabled', 'true');
    unsubscribeBtn?.setAttribute('disabled', 'true');
    return;
  }
  if (blocked) {
    updateStatus('blocked (notifications denied)');
    subscribeBtn?.setAttribute('disabled', 'true');
    unsubscribeBtn?.setAttribute('disabled', 'true');
    return;
  }
  updateStatus(subscribed ? 'subscribed' : 'not subscribed');

  if (subscribeBtn)   subscribeBtn.hidden   = !!subscribed;
  if (unsubscribeBtn) unsubscribeBtn.hidden = !subscribed;

}

async function refreshSubStatus() {
  const supported = ('serviceWorker' in navigator) && ('PushManager' in window);
  if (!supported) return setButtons({ supported: false });

  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;
    } catch {
      return setButtons({ supported: true, blocked: false, subscribed: false });
    }
  }

  const blocked = (typeof Notification !== 'undefined' && Notification.permission === 'denied');
  if (blocked) return setButtons({ supported: true, blocked: true });

  const sub = await reg.pushManager.getSubscription();
  setButtons({ supported: true, blocked: false, subscribed: !!sub });
  if (sub?.endpoint) localStorage.setItem('lastEndpoint', sub.endpoint);
}

async function getVapidPublicKey() {
  const res = await fetch('/.netlify/functions/public-key');
  if (!res.ok) throw new Error(`public-key failed (${res.status}): ${await res.text()}`);
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error('Missing VAPID_PUBLIC_KEY on server');
  return publicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function subscribe(opts = {}) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const pub = await getVapidPublicKey();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pub)
    });

    const res = await fetch('/.netlify/functions/store-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // body: JSON.stringify({ ...sub.toJSON(), ttlHours: opts.ttlHours ?? null })
      // body: JSON.stringify({ ...toServerSubscription(sub), ttlHours: opts.ttlHours ?? null, ua: navigator.userAgent })

      body: JSON.stringify({
         ...toServerSubscription(sub),
         ttlHours: opts.ttlHours ?? null,
         ua: navigator.userAgent
       })

    });

    if (!res.ok) throw new Error(`Store failed (${res.status}): ${await res.text()}`);
    log('Stored in Neon:', await res.text());
  } catch (e) {
    log('Subscribe error:', e.message);
  } finally {
    refreshSubStatus();
  }
}

async function unsubscribe() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    const endpoint = sub?.endpoint || localStorage.getItem('lastEndpoint');
    log('Unsubscribe: current endpoint =', endpoint || '(none)');

    // Browser-side unsubscribe
    if (sub) {
      const ok = await sub.unsubscribe();
      log('Browser unsubscribed =', String(ok));
    } else {
      log('No PushSubscription found in browser');
    }

    // Server-side delete
    const res = await fetch('/.netlify/functions/remove-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    });
    const text = await res.text();
    log('Server remove status =', res.status, 'body =', text);

    // Trust-but-verify against DB
    const check = await fetch('/.netlify/functions/check-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint })
    });
    const cjson = await check.json().catch(()=> ({}));
    log('Server check after remove =', JSON.stringify(cjson));

  } catch (e) {
    log('Unsubscribe error:', e.message || e);
  } finally {
    await refreshSubStatus();       // updates the UI state
    await updateDebugLocal?.();     // optional (your debug panel)
    await updateDebugServer?.();    // optional (your debug panel)
  }
}



async function exportCurrentSessionCsv() {
  // if (!currentSession?.id) return;
  // const url = new URL('/.netlify/functions/export-results', location.origin);
  // url.searchParams.set('session_id', currentSession.id);
  // url.searchParams.set('from', currentSession.startedAt);
  // url.searchParams.set('to', new Date().toISOString());

  // const res = await fetch(url.toString());
  // if (!res.ok) throw new Error('export failed');
  // const blob = await res.blob();
  // const a = document.createElement('a');
  // a.href = URL.createObjectURL(blob);
  // a.download = `msak_results_${currentSession.id}.csv`;
  // document.body.appendChild(a);
  // a.click();
  // a.remove();

  // if (currentSession?.timerId) clearTimeout(currentSession.timerId);
  // currentSession = null;
  const sid = currentSession?.subId;
  if (!sid) { log('No subId to export'); return; }
  downloadCsvForSession(sid);
}


async function runMsak({ sid, streams = 2, durationMs = 5000 } = {}) {
  // avoid duplicate runs for the same push SID (e.g., double SW posts)
  if (sid && activePushRuns.has(sid)) {
    log('runMsak: already running for sid', sid);
    return;
  }
  if (sid) activePushRuns.add(sid);

  let lastDL = null, lastUL = null;
  let sawFinalDL = false, sawFinalUL = false;
  let didSaveDL  = false, didSaveUL  = false;

  try {
    const client = new msak.Client('web-client', '0.3.1', {
      onDownloadResult: r => {
        lastDL = r;
        if (r?.final === true && !didSaveDL) {
          sawFinalDL = true;
          const bps  = extractGoodputBps(r);
          const mbps = (bps || 0) / 1e6;
          log(`↓ ${mbps.toFixed(2)} Mbps`);
          didSaveDL = true;

          sendResult('download', r, {
            sid, session_id: String(sid), streams, durationMs, goodput_bps_override: bps
          });

          markFinal('download');
        }
      },
      onUploadResult: r => {
        lastUL = r;
        if (r?.final === true && !didSaveUL) {
          sawFinalUL = true;
          const bps  = extractGoodputBps(r);
          const mbps = (bps || 0) / 1e6;
          log(`↑ ${mbps.toFixed(2)} Mbps`);
          didSaveUL = true;

          sendResult('upload', r, {
            sid, session_id: String(sid), streams, durationMs, goodput_bps_override: bps
          });

          markFinal('upload');
        }
      },
      onError: e => log('MSAK error:', e?.stack || e?.message || e)
    });

    // tag for traceability
    client.metadata = { sid, trigger: 'push', ua: navigator.userAgent };

    // v0.3.1 shim — map args to instance fields before start()
    if (!client.runThroughputTest) {
      client.runThroughputTest = function (a, b, c) {
        let _sid, _streams, _durationMs;
        if (a && typeof a === 'object') ({ sid: _sid, streams: _streams, durationMs: _durationMs } = a);
        else { _sid = a; _streams = b; _durationMs = c; }
        if (_streams != null) this.streams = _streams;
        if (_durationMs != null) this.duration = _durationMs;
        if (_sid != null) this.metadata = { ...(this.metadata || {}), sid: _sid };
        return this.start();
      };
    }

    await client.runThroughputTest({ streams, durationMs });

    // Fallbacks (SDK didn’t flag finals). Only save if not already saved.
    if (!sawFinalDL && lastDL && !didSaveDL) {
      const bps  = extractGoodputBps(lastDL);
      const mbps = (bps || 0) / 1e6;
      log(`↓ ${mbps.toFixed(2)} Mbps (fallback)`);
      didSaveDL = true;

      sendResult('download', lastDL, {
        sid, session_id: String(sid), streams, durationMs, goodput_bps_override: bps
      });

      markFinal('download');
    }
    if (!sawFinalUL && lastUL && !didSaveUL) {
      const bps  = extractGoodputBps(lastUL);
      const mbps = (bps || 0) / 1e6;
      log(`↑ ${mbps.toFixed(2)} Mbps (fallback)`);
      didSaveUL = true;

      sendResult('upload', lastUL, {
        sid, session_id: String(sid), streams, durationMs, goodput_bps_override: bps
      });

      markFinal('upload');
    }
  } catch (e) {
    log('runMsak error:', e?.message || e);
  } finally {
    if (sid) activePushRuns.delete(sid);
  }
}



async function runManualTest() {
  if (manualRunActive) { log('Manual test already running; ignoring.'); return; }
  manualRunActive = true;
  didSaveDL = false;
  didSaveUL = false;

  const btn = document.getElementById('runTestBtn');
  btn && (btn.disabled = true);

  updateStatus('running...');
  resultDisplay.textContent = '';
  log('Starting MSAK test');

  const sid = `manual-${Date.now()}`;
  const streams = 4;
  const durationMs = 5000;

  let lastDL = null, lastUL = null;
  let sawFinalDL = false, sawFinalUL = false;
  let printedKeys = false;

  try {
    const client = new msak.Client('web-client', '0.3.1', {
      onDownloadResult: r => {
        lastDL = r;
        if (!printedKeys && r) { printedKeys = true; log('Download keys:', Object.keys(r).join(','), 'final=', String(r.final)); }
        if (r?.final === true && !didSaveDL) {
          sawFinalDL = true;
          const bps = extractGoodputBps(r);
          const mbps = (bps || 0) / 1e6;
          log(`↓ ${mbps.toFixed(2)} Mbps`);
          resultDisplay.textContent += `Download (final):\n${JSON.stringify(r, null, 2)}\n\n`;
          didSaveDL = true;
          sendResult('download', r, { sid, session_id: currentSession?.id, streams, durationMs, goodput_bps_override: bps });
          markFinal('download');
        }
      },
      onUploadResult: r => {
        lastUL = r;
        if (!printedKeys && r) { printedKeys = true; log('Upload keys:', Object.keys(r).join(','), 'final=', String(r.final)); }
        if (r?.final === true && !didSaveUL) {
          sawFinalUL = true;
          const bps = extractGoodputBps(r);
          const mbps = (bps || 0) / 1e6;
          log(`↑ ${mbps.toFixed(2)} Mbps`);
          resultDisplay.textContent += `Upload (final):\n${JSON.stringify(r, null, 2)}\n\n`;
          didSaveUL = true;
          sendResult('upload', r, { sid, session_id: currentSession?.id, streams, durationMs, goodput_bps_override: bps });
          markFinal('upload');
        }
      },
      onError: e => log('MSAK error:', e?.stack || e?.message || e)
    });

    // 0.3.1 shim
    if (!client.runThroughputTest) {
      client.runThroughputTest = function (a, b, c) {
        let _sid, _streams, _durationMs;
        if (a && typeof a === 'object') ({ sid: _sid, streams: _streams, durationMs: _durationMs } = a);
        else { _sid = a; _streams = b; _durationMs = c; }
        if (_streams != null) this.streams = _streams;
        if (_durationMs != null) this.duration = _durationMs;
        if (_sid != null) this.metadata = { ...(this.metadata || {}), sid: _sid };
        return this.start();
      };
    }

    client.metadata = { sid, trigger: 'manual', ua: navigator.userAgent };
    await client.runThroughputTest({ streams, durationMs });

    // Fallbacks — only if we haven’t saved yet
    if (!sawFinalDL && lastDL && !didSaveDL) {
      const bps = extractGoodputBps(lastDL);
      const mbps = (bps || 0) / 1e6;
      log(`↓ ${mbps.toFixed(2)} Mbps (fallback)`);
      resultDisplay.textContent += `Download (fallback final):\n${JSON.stringify(lastDL, null, 2)}\n\n`;
      didSaveDL = true;
      sendResult('download', lastDL, { sid, session_id: currentSession?.id, streams, durationMs, goodput_bps_override: bps });
      markFinal('download');
    }
    if (!sawFinalUL && lastUL && !didSaveUL) {
      const bps = extractGoodputBps(lastUL);
      const mbps = (bps || 0) / 1e6;
      log(`↑ ${mbps.toFixed(2)} Mbps (fallback)`);
      resultDisplay.textContent += `Upload (fallback final):\n${JSON.stringify(lastUL, null, 2)}\n\n`;
      didSaveUL = true;
      sendResult('upload', lastUL, { sid, session_id: currentSession?.id, streams, durationMs, goodput_bps_override: bps });
      markFinal('upload');
    }

    updateStatus('complete');
  } catch (e) {
    log('runManualTest error:', e?.message || e);
    updateStatus('error');
  } finally {
    manualRunActive = false;
    btn && (btn.disabled = false);
  }
}


async function oneHourRunThenCsv() {
  // fresh session
  if (currentSession?.countdownTimerId) clearInterval(currentSession.countdownTimerId);
  if (currentSession?.timerId) clearTimeout(currentSession.timerId);

  currentSession = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    subId: null,
    expiresAt: null,
    runCount: 0,
    countdownTimerId: null,
    timerId: null,
    didExport: false
  };

  try {
    // Ensure PushSubscription
    const browserSub = await ensureSubscription();

    // Send to server with 1-hour TTL
    const flat = { ...toServerSubscription(browserSub), ua: navigator.userAgent, ttlHours: 1 };
    if (!flat.endpoint || !flat.p256dh || !flat.auth) {
      log('Client mapping error: missing endpoint/p256dh/auth', JSON.stringify(flat));
    }

    const r = await fetch('/.netlify/functions/store-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(flat)
    });

    if (!r.ok) {
      const text = await r.text().catch(()=> '');
      log('store-subscription body:', text);
      throw new Error(`store-subscription failed (${r.status})`);
    }

    const data = await r.json();
    if (!data?.ok) throw new Error('store-subscription returned not ok');

    currentSession.subId = data.id ?? null;
    currentSession.expiresAt = data.app_expires_at ?? null;

    log(`Starting 1-hour session ${currentSession.id} (subId=${currentSession.subId})`);
    saveSessionState();            // persist now
    await updateDebugLocal();
    await updateDebugServer();
    startCountdown();
    ensureExportWatcher();

    // Optional: immediate run
    if (currentSession.subId != null) {
      try { runMsak({ sid: String(currentSession.subId), streams: 2, durationMs: 5000 }); } catch {}
    }

    // Precise “primary” timer based on server expiry (+grace)
    const now = Date.now();
    const expiryTs = currentSession.expiresAt ? new Date(currentSession.expiresAt).getTime() : (now + 60*60*1000);
    const delay = Math.max(5_000, (expiryTs - now) + 90_000);
    currentSession.timerId = setTimeout(() => maybeTriggerCsvExport(true), delay);

  } catch (e) {
    log('oneHourRunThenCsv error: ' + (e?.message || e));
    if (currentSession?.countdownTimerId) clearInterval(currentSession.countdownTimerId);
    if (currentSession?.timerId) clearTimeout(currentSession.timerId);
    currentSession = null;
    clearSessionState();
  }
}


async function sendResult(direction, r, { sid, session_id, streams, durationMs, goodput_bps_override }) {
  // only include sub_id if numeric
  const numericSid = typeof sid === 'number' || /^\d+$/.test(String(sid)) ? Number(sid) : undefined;

  // prefer explicit override, else derive from r
  const bps = (typeof goodput_bps_override === 'number')
    ? goodput_bps_override
    : extractGoodputBps(r);

  const body = {
    direction,
    session_id: session_id ?? null,
    goodput_bps: bps,                  // <-- always a number (or null)
    streams: streams ?? null,
    duration_ms: durationMs ?? null,
    result_json: r ?? null
  };
  if (numericSid !== undefined) body.sub_id = numericSid;

  const res = await fetch('/.netlify/functions/save-result', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text().catch(()=> '');
  if (!res.ok) log('save-result failed', res.status, text);
  else         log('save-result ok', text);
}



subscribeBtn?.addEventListener('click', () => subscribe());
unsubscribeBtn?.addEventListener('click', unsubscribe);

// subscribeBtn && (subscribeBtn.hidden = subscribed);
// unsubscribeBtn && (unsubscribeBtn.hidden = !subscribed);


runBtn?.addEventListener('click', runManualTest);
// subscribeOnceBtn?.addEventListener('click', subscribeFor1HourThenUnsubscribe);

document.getElementById('subscribeOnceBtn')?.addEventListener('click', oneHourRunThenCsv);




navigator.serviceWorker?.addEventListener('message', (evt) => {
  if (evt.data?.type === 'RUN_TEST') {
    log('Push payload:', JSON.stringify(evt.data.payload));
    runMsak(evt.data.payload || {}); // should be { sid, streams, durationMs }
  }
});

if (navigator.permissions?.query) {
  try {
    navigator.permissions.query({ name: 'notifications' })
      .then(perm => perm.onchange = refreshSubStatus);
  } catch {}
}

refreshSubStatus();
updateDebugServer();

// Restore/export pending CSV if a 1-hour session was in progress
(function restoreExportIfPending(){
  const s = loadSessionState();
  if (s && !s.didExport) {
    currentSession = s;
    startCountdown();
    ensureExportWatcher();
    // In case we already passed expiry while the tab was closed
    maybeTriggerCsvExport(false);
  }
})();
