// app.js

let currentSession = null; // { id, startedAt, timerId }


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
    }
    if (data.app_expires_at && !currentSession?.expiresAt) {
      currentSession = currentSession || {};
      currentSession.expiresAt = data.app_expires_at;
      dbg.expiresAt.textContent = data.app_expires_at;
      startCountdown();
    }
  } catch {
    dbg.server.textContent = 'error';
  }
}

function startCountdown() {
  clearCountdown();
  if (!currentSession?.expiresAt) { dbg.countdown.textContent = '—'; return; }
  function tick() {
    const ms = new Date(currentSession.expiresAt).getTime() - Date.now();
    if (ms <= 0) { dbg.countdown.textContent = 'expired'; clearCountdown(); return; }
    const m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
    dbg.countdown.textContent = `${m}m ${s}s`;
  }
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
    if (sub) await sub.unsubscribe();
    log('Unsubscribed from push in browser.');

    const res = await fetch('/.netlify/functions/remove-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    });

    if (!res.ok) throw new Error(`Backend remove failed (${res.status}): ${await res.text()}`);
    log('Removed from Neon:', await res.text());
  } catch (e) {
    log('Unsubscribe error:', e.message);
  } finally {
    refreshSubStatus();
  }
}

async function exportCurrentSessionCsv() {
  if (!currentSession?.id) return;
  const url = new URL('/.netlify/functions/export-results', location.origin);
  url.searchParams.set('session_id', currentSession.id);
  url.searchParams.set('from', currentSession.startedAt);
  url.searchParams.set('to', new Date().toISOString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('export failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `msak_results_${currentSession.id}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  if (currentSession?.timerId) clearTimeout(currentSession.timerId);
  currentSession = null;
}


async function runMsak({ sid, streams = 2, durationMs = 5000 } = {}) {
  try {
    const client = new msak.Client('web-client', '0.3.1', {

      onDownloadResult: r => {
        if (r?.final) {
          finalDownload = r;
          const streams = 4, durationMs = 3600; // your test args below
          sendResult('download', r, { sid, session_id: currentSession?.id, streams, durationMs });
          markFinal('download');
        }
      },
      onUploadResult: r => {
        if (r?.final) {
          finalUpload = r;
          const streams = 4, durationMs = 3600;
          sendResult('upload', r, { sid, session_id: currentSession?.id, streams, durationMs });
          markFinal('upload');
        }
      },

      onError: e => log('MSAK error:', e.stack || e.message || e)
    });

    // shim for 0.3.1
    if (!client.runThroughputTest) {
      client.runThroughputTest = (args) => client.start(args);
    }

    await client.runThroughputTest({ streams, durationMs });
  } catch (e) {
    log('runMsak error:', e.message || e);
  }
}


async function runManualTest() {
  updateStatus('running...');
  resultDisplay.textContent = '';
  log('Starting MSAK test');

  try {
    const sid = `manual-${Date.now()}`;
    let finalDownload = null;
    let finalUpload = null;

    const client = new msak.Client('web-client', '0.3.1', {
      // onDownloadResult: (r) => { finalDownload = r; },
      // onUploadResult:   (r) => { finalUpload = r; },

      onDownloadResult: r => {
        if (r?.final) {
          finalDownload = r;
          const streams = 4, durationMs = 3600;
          sendResult('download', r, { sid, session_id: currentSession?.id, streams, durationMs });
          markFinal('download');
        }
      },
      onUploadResult: r => {
        if (r?.final) {
          finalUpload = r;
          const streams = 4, durationMs = 3600;
          sendResult('upload', r, { sid, session_id: currentSession?.id, streams, durationMs });
          markFinal('upload');
        }
      },
      onError:          (e) => log('MSAK error:', e.stack || e.message || e)
    });

    client.metadata = { sid, trigger: 'manual', ua: navigator.userAgent };

    // ✅ Add shim for v0.3.1 if needed
    if (!client.runThroughputTest) {
      client.runThroughputTest = function (a, b, c) {
        let sid, streams, durationMs;
        if (a && typeof a === 'object') ({ sid, streams, durationMs } = a);
        else { sid = a; streams = b; durationMs = c; }
        if (streams) this.streams = streams;
        if (durationMs) this.duration = durationMs;
        if (sid) this.metadata = { ...(this.metadata || {}), sid };
        return this.start();
      };
    }

    await client.runThroughputTest({ sid, streams: 4, durationMs: 3600 });

    if (finalDownload) {
      const mbpsDown = (finalDownload.goodput_bps || 0) / 1e6;
      log(`↓ ${mbpsDown.toFixed(2)} Mbps`);
      resultDisplay.textContent += `Download:\n${JSON.stringify(finalDownload, null, 2)}\n\n`;
      await sendResult('download', finalDownload, { sid, streams: 4, durationMs: 3600 });
    }

    if (finalUpload) {
      const mbpsUp = (finalUpload.goodput_bps || 0) / 1e6;
      log(`↑ ${mbpsUp.toFixed(2)} Mbps`);
      resultDisplay.textContent += `Upload:\n${JSON.stringify(finalUpload, null, 2)}\n\n`;
      await sendResult('upload', finalUpload, { sid, streams: 4, durationMs: 3600 });
    }
    updateStatus('complete');
  } catch (err) {
    log(`Error: ${err.message}`);
    updateStatus('error');
  }
}

// async function subscribeFor1HourThenUnsubscribe() {
//   log('Subscribing for 1 hour');
//   await subscribe({ ttlHours: 1 });
//   log('Subscribed. Will unsubscribe after 1 hour.');

//   setTimeout(() => {
//     log('Auto-unsubscribing after 1 hour');
//     unsubscribe();
//   }, 60 * 60 * 1000);
// }


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
    timerId: null
  };

  try {
    // Ensure browser-side PushSubscription (no TTL here)
    const browserSub = await ensureSubscription();

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
      const text = await r.text().catch(()=>'');
      log('store-subscription 400 body:', text);
      throw new Error(`store-subscription failed (${r.status})`);
    }


    if (!r.ok) throw new Error(`store-subscription failed (${r.status})`);
    const data = await r.json();
    if (!data?.ok) throw new Error('store-subscription returned not ok');

    currentSession.subId = data.id ?? null;
    currentSession.expiresAt = data.app_expires_at ?? null;

    log('Starting 1-hour session: ' + currentSession.id);
    await updateDebugLocal();     // local subscription state
    await updateDebugServer();    // server truth
    startCountdown();             // live countdown to app_expires_at

    // Safety timer: auto-unsub + export after 60m
    currentSession.timerId = setTimeout(async () => {
      await unsubscribe();             // removes locally + calls remove-subscription
      await exportCurrentSessionCsv(); // triggers CSV download
    }, 60 * 60 * 1000);

  } catch (e) {
    log('oneHourRunThenCsv error: ' + (e?.message || e));
    // best-effort cleanup
    if (currentSession?.countdownTimerId) clearInterval(currentSession.countdownTimerId);
    if (currentSession?.timerId) clearTimeout(currentSession.timerId);
    currentSession = null;
  }
}


// async function sendResult(direction, r, { sid, session_id }) {
//   const body = {
//     direction,
//     sid,
//     sub_id: sid,                  // ok to send both; backend uses either
//     session_id,                   // <-- new
//     goodput_bps: r.goodput_bps,
//     streams,
//     duration_ms: durationMs,
//     result_json: r
//   };
//   await fetch('/.netlify/functions/save-result', {
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify(body)
//   });
// }


async function sendResult(direction, r, { sid, session_id, streams, durationMs }) {
  const body = {
    direction,
    sid,
    sub_id: sid,
    session_id,
    goodput_bps: r.goodput_bps,
    streams,
    duration_ms: durationMs,
    result_json: r
  };
  await fetch('/.netlify/functions/save-result', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}


// subscribeBtn?.addEventListener('click', () => subscribe());
// unsubscribeBtn?.addEventListener('click', unsubscribe);

// subscribeBtn && (subscribeBtn.hidden = subscribed);
// unsubscribeBtn && (unsubscribeBtn.hidden = !subscribed);


runBtn?.addEventListener('click', runManualTest);
// subscribeOnceBtn?.addEventListener('click', subscribeFor1HourThenUnsubscribe);

document.getElementById('subscribeOnceBtn')?.addEventListener('click', oneHourRunThenCsv);


// navigator.serviceWorker?.addEventListener('message', (evt) => {
//   if (evt.data?.type === 'RUN_TEST') {
//     log('Received push-triggered test request');
//     runManualTest();
//   }
// });

// navigator.serviceWorker?.addEventListener('message', (evt) => {
//   if (evt.data?.type === 'RUN_TEST') {
//     log('Received push-triggered test request');
//     runMsak(evt.data.payload || {}); // pass payload containing sid/streams/durationMs
//   }
// });


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

