const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
function log(...args) { logEl.textContent += args.join(' ') + "\n"; }


// Shim for msak v0.3.1: add runThroughputTest(sid, streams, durationMs | {sid, streams, durationMs})
if (window.msak && msak.Client && !msak.Client.prototype.runThroughputTest) {
  msak.Client.prototype.runThroughputTest = function (a, b, c) {
    let sid, streams, durationMs;
    if (a && typeof a === 'object') ({ sid, streams, durationMs } = a);
    else { sid = a; streams = b; durationMs = c; }

    try { if (streams) this.streams = streams; } catch {}
    try { if (durationMs) this.duration = durationMs; } catch {}

    if (sid) this.metadata = { ...(this.metadata || {}), sid };

    // v0.3.1 runs download+upload via start()
    return this.start();
  };
}


async function getVapidPublicKey() {
  const res = await fetch('/.netlify/functions/public-key');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`public-key failed (${res.status}): ${text}`);
  }
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error('Missing VAPID_PUBLIC_KEY on server');
  log('VAPID public key length:', publicKey.length);
  return publicKey;
}

// helper to convert Base64URL to UInt8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
  const reg = await navigator.serviceWorker.register('/service-worker.js');
  await navigator.serviceWorker.ready;
  log('Service worker registered:', reg.scope);
  return reg;
}

async function subscribe() {
  statusEl.textContent = 'subscribing…';
  try {
    // Optional: make the permission state explicit in logs
    if ('Notification' in window) log('Notification.permission =', Notification.permission);

    const reg = await ensureServiceWorker();
    const pub = await getVapidPublicKey();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pub)
    });

    log('Got subscription for endpoint:', sub.endpoint);

    const res = await fetch('/.netlify/functions/store-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON())
    });

    // >>> Changed: show server error details
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Store failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    statusEl.textContent = 'subscribed';
    log('Stored in Neon:', JSON.stringify(data));
  } catch (e) {
    statusEl.textContent = 'error';
    log('Subscribe error:', e.message);
    alert(e.message);
  }
}

document.getElementById('subscribeBtn').addEventListener('click', subscribe);

log('Ready. Click "Subscribe to Push".');

navigator.serviceWorker?.addEventListener('message', (evt) => {
  if (evt.data?.type === 'RUN_TEST') {
    log('Received push-triggered test request');
    runMsak(evt.data.payload || {});
  }
});

if (getParam('run') === '1') {
  log('Auto-running test from notification URL');
  runMsak({
    sid: getParam('sid'),
    streams: getParam('streams'),
    durationMs: getParam('durationMs')
  });
}


// Where your msak-server is hosted
const MSAK_BASE_WSS = 'wss://msakserver.calspeed.org/throughput/v1';
// Default test knobs (can be overridden by push payload)
const DEFAULT_STREAMS = 2;
const DEFAULT_DURATION_MS = 5000;

let running = false;

function getParam(name) {
  return new URL(location.href).searchParams.get(name);
}

async function runMsak(payload = {}) {
  if (running) {
    log('MSAK already running. Skipping duplicate run.');
    return;
  }
  running = true;
  try {

    document.getElementById('subscribeBtn').disabled = true;
    statusEl.textContent = 'Running test…';

    const streams = Number(payload.streams ?? getParam('streams') ?? DEFAULT_STREAMS);
    const durationMs = Number(payload.durationMs ?? getParam('durationMs') ?? DEFAULT_DURATION_MS);
    const sid = payload.sid ?? getParam('sid') ?? null;

    // log(`Starting MSAK test (sid=${sid}, streams=${streams}, durationMs=${durationMs})`);

    // const client = new msak.Client('web-client', '0.3.1', {
    //   onDownloadResult: r => {
    //     log('Download result:', JSON.stringify(r));
    //     sendResult('download', r, { sid });
    //   },
    //   onUploadResult: r => {
    //     log('Upload result:', JSON.stringify(r));
    //     sendResult('upload', r, { sid });
    //   },
    //   onError: e => {
    //     log('MSAK error:', e.message || e);
    //   }
    // });

    // await client.runThroughputTest({
    //   downloadURL: `${MSAK_BASE_WSS}/download`,
    //   uploadURL:   `${MSAK_BASE_WSS}/upload`,
    //   streams,
    //   durationMs
    // });

    log(`Starting MSAK test (sid=${sid}, streams=${streams}, durationMs=${durationMs})`);

    const client = new msak.Client('web-client', '0.3.1', {
      onDownloadResult: r => {
        log('Download result:', JSON.stringify(r));
        sendResult('download', r, { sid });
      },
      onUploadResult: r => {
        log('Upload result:', JSON.stringify(r));
        sendResult('upload', r, { sid });
      },
      onError: e => {
        log('MSAK error:', e.message || e);
      }
    });


    await client.runThroughputTest(sid, streams, durationMs);


    log('MSAK test complete.');
    statusEl.textContent = 'Test complete.';

  } catch (err) {
    log('MSAK run error:', err.message || err);
  } finally {
    running = false;
    document.getElementById('subscribeBtn').disabled = false;

  }
}

async function sendResult(direction, r, { sid }) {
  const goodput_bps = r.GoodputBitsPerSecond ?? r.goodput_bps ?? null;
  const streams = r.Streams ?? r.streams ?? null;
  const duration_ms = r.ElapsedTime ?? r.durationMs ?? null;

  try {
    const res = await fetch('/.netlify/functions/save-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direction,
        sid: sid ? Number(sid) : null,
        goodput_bps,
        streams,
        duration_ms,
        result_json: r
      })
    });

    if (!res.ok) throw new Error(`Failed to store result (${res.status})`);
    const data = await res.json();
    log(`Result stored (${direction}):`, JSON.stringify(data));
  } catch (err) {
    log('Result save error:', err.message || err);
  }
}
