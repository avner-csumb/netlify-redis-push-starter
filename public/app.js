// app.js

const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
const resultDisplay = document.getElementById('resultDisplay');
const subscribeBtn = document.getElementById('subscribeBtn');
const unsubscribeBtn = document.getElementById('unsubscribeBtn');
const runBtn = document.getElementById('runTestBtn');

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
  subscribeBtn.hidden = subscribed;
  unsubscribeBtn.hidden = !subscribed;
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
      body: JSON.stringify({ ...sub.toJSON(), ttlHours: opts.ttlHours ?? null })
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

async function runManualTest() {
  updateStatus('running...');
  resultDisplay.textContent = '';
  log('Starting MSAK test');

  try {
    const sid = `manual-${Date.now()}`;
    let finalDownload = null;
    let finalUpload = null;

    const client = new msak.Client('web-client', '0.3.1', {
      onDownloadResult: (r) => { finalDownload = r; },
      onUploadResult:   (r) => { finalUpload = r; },
      onError:          (e) => log('MSAK error:', e.stack || e.message || e)
    });

    client.metadata = { sid, trigger: 'manual', ua: navigator.userAgent };

    await client.runThroughputTest({ sid, streams: 4, durationMs: 3600 });

    if (finalDownload) {
      log(`↓ ${finalDownload.goodput.toFixed(2)} Mbps`);
      resultDisplay.textContent += `Download:\n${JSON.stringify(finalDownload, null, 2)}\n\n`;
      await sendResult('download', finalDownload, { sid });
    }

    if (finalUpload) {
      log(`↑ ${finalUpload.goodput.toFixed(2)} Mbps`);
      resultDisplay.textContent += `Upload:\n${JSON.stringify(finalUpload, null, 2)}\n\n`;
      await sendResult('upload', finalUpload, { sid });
    }

    updateStatus('complete');
  } catch (err) {
    log(`Error: ${err.message}`);
    updateStatus('error');
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
      body: JSON.stringify({ direction, sid, goodput_bps, streams, duration_ms, result_json: r })
    });
    if (!res.ok) throw new Error(`Failed to store result (${res.status})`);
    log(`Result stored (${direction}):`, await res.text());
  } catch (err) {
    log('Result save error:', err.message || err);
  }
}

subscribeBtn?.addEventListener('click', () => subscribe());
unsubscribeBtn?.addEventListener('click', unsubscribe);
runBtn?.addEventListener('click', runManualTest);

navigator.serviceWorker?.addEventListener('message', (evt) => {
  if (evt.data?.type === 'RUN_TEST') {
    log('Received push-triggered test request');
    runManualTest();
  }
});

if (navigator.permissions?.query) {
  try {
    navigator.permissions.query({ name: 'notifications' })
      .then(perm => perm.onchange = refreshSubStatus);
  } catch {}
}

refreshSubStatus();



// // const logEl = document.getElementById('log');
// // const statusEl = document.getElementById('status');
// // function log(...args) { logEl.textContent += args.join(' ') + "\n"; }


// // Shim for msak v0.3.1: add runThroughputTest(sid, streams, durationMs | {sid, streams, durationMs})
// // if (window.msak && msak.Client && !msak.Client.prototype.runThroughputTest) {
// //   msak.Client.prototype.runThroughputTest = function (a, b, c) {
// //     let sid, streams, durationMs;
// //     if (a && typeof a === 'object') ({ sid, streams, durationMs } = a);
// //     else { sid = a; streams = b; durationMs = c; }

// //     try { if (streams) this.streams = streams; } catch {}
// //     try { if (durationMs) this.duration = durationMs; } catch {}

// //     if (sid) this.metadata = { ...(this.metadata || {}), sid };

// //     // v0.3.1 runs download+upload via start()
// //     return this.start();
// //   };
// // }

// const logEl = document.getElementById('log');
// const statusEl = document.getElementById('status');
// const runBtn = document.getElementById('runTestBtn');
// const resultDisplay = document.getElementById('resultDisplay');


// function log(...args) {
//   const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
//   logEl.textContent += line;
//   logEl.scrollTop = logEl.scrollHeight;
// }

// function updateStatus(text) {
//   statusEl.textContent = text;
// }


// // Shim for msak v0.3.1: add runThroughputTest(sid, streams, durationMs | {sid, streams, durationMs})


// if (self.msak?.Client && !msak.Client.prototype.runThroughputTest) {
//   msak.Client.prototype.runThroughputTest = function (a, b, c) {
//     let sid, streams, durationMs;
//     if (a && typeof a === 'object') ({ sid, streams, durationMs } = a);
//     else { sid = a; streams = b; durationMs = c; }

//     // Only set fields if they exist on this instance
//     if (typeof streams !== 'undefined' && 'streams' in this) {
//       try { this.streams = streams; } catch {}
//     }
//     if (typeof durationMs !== 'undefined' && ('duration' in this || 'durationMs' in this)) {
//       try { this.duration = durationMs; } catch {}
//       try { this.durationMs = durationMs; } catch {}
//     }
//     if (sid) this.metadata = { ...(this.metadata || {}), sid };

//     // Preserve start() signature for 0.3.x
//     return this.start();
//   };
// }

// async function getVapidPublicKey() {
//   const res = await fetch('/.netlify/functions/public-key');
//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`public-key failed (${res.status}): ${text}`);
//   }
//   const { publicKey } = await res.json();
//   if (!publicKey) throw new Error('Missing VAPID_PUBLIC_KEY on server');
//   log('VAPID public key length:', publicKey.length);
//   return publicKey;
// }

// // helper to convert Base64URL to UInt8Array
// function urlBase64ToUint8Array(base64String) {
//   const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
//   const rawData = atob(base64);
//   const outputArray = new Uint8Array(rawData.length);
//   for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
//   return outputArray;
// }

// async function ensureServiceWorker() {
//   if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
//   const reg = await navigator.serviceWorker.register('/service-worker.js');
//   await navigator.serviceWorker.ready;
//   log('Service worker registered:', reg.scope);
//   return reg;
// }


// async function subscribe(opts = {}) {
//   updateStatus('subscribing…');
//   try {
//     const reg = await ensureServiceWorker();
//     const pub = await getVapidPublicKey();
//     const sub = await reg.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(pub)
//     });

//     // include ttlHours if provided
//     const res = await fetch('/.netlify/functions/store-subscription', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ ...sub.toJSON(), ttlHours: opts.ttlHours ?? null })
//     });

//     if (!res.ok) throw new Error(`Store failed (${res.status}): ${await res.text()}`);
//     updateStatus(opts.ttlHours ? `subscribed (expires in ${opts.ttlHours}h)` : 'subscribed');
//   } catch (e) {
//     updateStatus('error');
//     log('Subscribe error:', e.message);
//   }
// }

// // async function subscribe() {
// //   statusEl.textContent = 'subscribing…';
// //   try {
// //     // Optional: make the permission state explicit in logs
// //     if ('Notification' in window) log('Notification.permission =', Notification.permission);

// //     const reg = await ensureServiceWorker();
// //     const pub = await getVapidPublicKey();

// //     const sub = await reg.pushManager.subscribe({
// //       userVisibleOnly: true,
// //       applicationServerKey: urlBase64ToUint8Array(pub)
// //     });

// //     log('Got subscription for endpoint:', sub.endpoint);

// //     const res = await fetch('/.netlify/functions/store-subscription', {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify(sub.toJSON())
// //     });

// //     // >>> Changed: show server error details
// //     if (!res.ok) {
// //       const text = await res.text();
// //       throw new Error(`Store failed (${res.status}): ${text}`);
// //     }

// //     const data = await res.json();
// //     statusEl.textContent = 'subscribed';
// //     log('Stored in Neon:', JSON.stringify(data));
// //   } catch (e) {
// //     statusEl.textContent = 'error';
// //     log('Subscribe error:', e.message);
// //     alert(e.message);
// //   }
// // }

// document.getElementById('subscribeBtn').addEventListener('click', subscribe);

// log('Ready. Click "Subscribe to Push".');

// document.getElementById('subscribeTemp4hBtn').addEventListener('click', () => subscribe({ ttlHours: 4 }));


// navigator.serviceWorker?.addEventListener('message', (evt) => {
//   if (evt.data?.type === 'RUN_TEST') {
//     log('Received push-triggered test request');
//     runMsak(evt.data.payload || {});
//   }
// });

// if (getParam('run') === '1') {
//   log('Auto-running test from notification URL');
//   runMsak({
//     sid: getParam('sid'),
//     streams: getParam('streams'),
//     durationMs: getParam('durationMs')
//   });
// }


// // Where your msak-server is hosted
// const MSAK_BASE_WSS = 'wss://msakserver.calspeed.org/throughput/v1';
// // Default test knobs (can be overridden by push payload)
// const DEFAULT_STREAMS = 2;
// const DEFAULT_DURATION_MS = 5000;

// let running = false;

// function getParam(name) {
//   return new URL(location.href).searchParams.get(name);
// }

// async function runMsak(payload = {}) {
//   if (running) {
//     log('MSAK already running. Skipping duplicate run.');
//     return;
//   }
//   running = true;
//   try {

//     document.getElementById('subscribeBtn').disabled = true;
//     statusEl.textContent = 'Running test…';

//     const streams = Number(payload.streams ?? getParam('streams') ?? DEFAULT_STREAMS);
//     const durationMs = Number(payload.durationMs ?? getParam('durationMs') ?? DEFAULT_DURATION_MS);
//     const sid = payload.sid ?? getParam('sid') ?? null;

//     // log(`Starting MSAK test (sid=${sid}, streams=${streams}, durationMs=${durationMs})`);

//     // const client = new msak.Client('web-client', '0.3.1', {
//     //   onDownloadResult: r => {
//     //     log('Download result:', JSON.stringify(r));
//     //     sendResult('download', r, { sid });
//     //   },
//     //   onUploadResult: r => {
//     //     log('Upload result:', JSON.stringify(r));
//     //     sendResult('upload', r, { sid });
//     //   },
//     //   onError: e => {
//     //     log('MSAK error:', e.message || e);
//     //   }
//     // });

//     // await client.runThroughputTest({
//     //   downloadURL: `${MSAK_BASE_WSS}/download`,
//     //   uploadURL:   `${MSAK_BASE_WSS}/upload`,
//     //   streams,
//     //   durationMs
//     // });

//     log(`Starting MSAK test (sid=${sid}, streams=${streams}, durationMs=${durationMs})`);

//     const client = new msak.Client('web-client', '0.3.1', {
//       onDownloadResult: r => {
//         log('Download result:', JSON.stringify(r));
//         sendResult('download', r, { sid });
//       },
//       onUploadResult: r => {
//         log('Upload result:', JSON.stringify(r));
//         sendResult('upload', r, { sid });
//       },
//       onError: e => {
//         log('MSAK error:', e.message || e);
//       }
//     });


//     await client.runThroughputTest(sid, streams, durationMs);


//     log('MSAK test complete.');
//     statusEl.textContent = 'Test complete.';

//   } catch (err) {
//     log('MSAK run error:', err.message || err);
//   } finally {
//     running = false;
//     document.getElementById('subscribeBtn').disabled = false;

//   }
// }

// async function sendResult(direction, r, { sid }) {
//   const goodput_bps = r.GoodputBitsPerSecond ?? r.goodput_bps ?? null;
//   const streams = r.Streams ?? r.streams ?? null;
//   const duration_ms = r.ElapsedTime ?? r.durationMs ?? null;

//   try {
//     const res = await fetch('/.netlify/functions/save-result', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         direction,
//         sid: sid ? Number(sid) : null,
//         goodput_bps,
//         streams,
//         duration_ms,
//         result_json: r
//       })
//     });

//     if (!res.ok) throw new Error(`Failed to store result (${res.status})`);
//     const data = await res.json();
//     log(`Result stored (${direction}):`, JSON.stringify(data));
//   } catch (err) {
//     log('Result save error:', err.message || err);
//   }
// }


// // const statusEl = document.getElementById('status');
// // const logEl = document.getElementById('log');
// // const runBtn = document.getElementById('runTestBtn');

// // function log(msg) {
// //   console.log(msg);
// //   logEl.textContent += `[${new Date().toISOString()}] ${msg}\n`;
// //   logEl.scrollTop = logEl.scrollHeight;
// // }

// // function updateStatus(text) {
// //   statusEl.textContent = text;
// // }


// async function runManualTest() {
//   updateStatus('running...');
//   resultDisplay.textContent = '';
//   log('Starting MSAK test');

//   try {
//     const sid = `manual-${Date.now()}`;

//     let finalDownload = null;
//     let finalUpload = null;

//     const client = new msak.Client('web-client', '0.3.1', {
//       onDownloadResult: (r) => {
//         finalDownload = r;
//       },
//       onUploadResult: (r) => {
//         finalUpload = r;
//       },
//       onError: (e) => {
//         log('MSAK error:', e.message || e);
//         updateStatus('error');
//       }
//     });

//     client.metadata = {
//       sid,
//       trigger: 'manual',
//       ua: navigator.userAgent
//     };

//     await client.runThroughputTest({
//       sid,
//       streams: 4,
//       durationMs: 3600
//     });

//     log('MSAK test complete.');

//     // ✅ Only log the final values
//     if (finalDownload) {
//       log(`↓ ${finalDownload.goodput.toFixed(2)} Mbps`);
//       resultDisplay.textContent += `Download:\n${JSON.stringify(finalDownload, null, 2)}\n\n`;
//       await sendResult('download', finalDownload, { sid });
//     }

//     if (finalUpload) {
//       log(`↑ ${finalUpload.goodput.toFixed(2)} Mbps`);
//       resultDisplay.textContent += `Upload:\n${JSON.stringify(finalUpload, null, 2)}\n\n`;
//       await sendResult('upload', finalUpload, { sid });
//     }

//     updateStatus('complete');
//   } catch (err) {
//     log(`Error: ${err.message}`);
//     updateStatus('error');
//   }
// }

// async function unsubscribe() {
//   updateStatus('unsubscribing…');
//   try {
//     const reg = await navigator.serviceWorker.getRegistration();
//     if (!reg) throw new Error('No service worker registration found.');

//     const sub = await reg.pushManager.getSubscription();
//     if (!sub) {
//       log('No existing push subscription to unsubscribe.');
//       updateStatus('not subscribed');
//       return;
//     }

//     // Unsubscribe from the browser
//     const unsubscribed = await sub.unsubscribe();
//     if (!unsubscribed) throw new Error('Failed to unsubscribe from push');

//     log('Unsubscribed from push in browser.');

//     // Also tell your backend to remove the subscription
//     const res = await fetch('/.netlify/functions/remove-subscription', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ endpoint: sub.endpoint })
//     });

//     if (!res.ok) {
//       const text = await res.text();
//       throw new Error(`Backend remove failed (${res.status}): ${text}`);
//     }

//     const json = await res.json();
//     log('Removed from Neon:', JSON.stringify(json));
//     updateStatus('unsubscribed');
//   } catch (e) {
//     log('Unsubscribe error:', e.message);
//     updateStatus('error');
//   }
// }



// // async function runManualTest() {
// //   updateStatus('running...');
// //   resultDisplay.textContent = '';
// //   log('Starting MSAK test');

// //   try {
// //     const sid = `manual-${Date.now()}`;

// //     const client = new msak.Client('web-client', '0.3.1', {
// //       onDownloadResult: async (r) => {
// //         log('Download result:', JSON.stringify(r));
// //         await sendResult('download', r, { sid });
// //         updateStatus('download done');
// //         resultDisplay.textContent += `Download:\n${JSON.stringify(r, null, 2)}\n\n`;
// //       },
// //       onUploadResult: async (r) => {
// //         log('Upload result:', JSON.stringify(r));
// //         await sendResult('upload', r, { sid });
// //         updateStatus('upload done');
// //         resultDisplay.textContent += `Upload:\n${JSON.stringify(r, null, 2)}\n\n`;
// //       },
// //       onError: (e) => {
// //         log('MSAK error:', e.message || e);
// //         updateStatus('error');
// //       }
// //     });

// //     client.metadata = {
// //       sid,
// //       trigger: 'manual',
// //       ua: navigator.userAgent
// //     };

// //     await client.runThroughputTest({
// //       sid,
// //       streams: 4,
// //       durationMs: 3600
// //     });

// //     log('MSAK test complete.');
// //     updateStatus('complete');
// //   } catch (err) {
// //     log(`Error: ${err.message}`);
// //     updateStatus('error');
// //   }
// // }



// // async function runManualTest() {
// //   updateStatus('running...');
// //   log('Starting MSAK test');

// //   try {
// //     const sid = `manual-${Date.now()}`;
// //     // const client = new msak.Client('wss://msakserver.calspeed.org');
// //     const client = new msak.Client('web-client', '0.3.1');

// //       client.metadata = {
// //       ...(client.metadata || {}),
// //       sid,
// //       trigger: 'manual',
// //       ua: navigator.userAgent
// //     };


// //     // Shim for older version
// //     if (!client.runThroughputTest) {
// //       client.runThroughputTest = function (a, b, c) {
// //         let sid, streams, durationMs;
// //         if (a && typeof a === 'object') ({ sid, streams, durationMs } = a);
// //         else { sid = a; streams = b; durationMs = c; }

// //         if (streams) this.streams = streams;
// //         if (durationMs) this.duration = durationMs;
// //         if (sid) this.metadata = { ...(this.metadata || {}), sid };

// //         return this.start();
// //       };
// //     }

// //     const result = await client.runThroughputTest({
// //       sid,
// //       streams: 4,
// //       durationMs: 3600
// //     });

// //     log(`Test finished: ↓ ${result.downloadGoodputMbps} Mbps, ↑ ${result.uploadGoodputMbps} Mbps, RTT: ${result.minRttMs} ms`);

// //     // Optional: send to Netlify
// //     const saveRes = await fetch('/.netlify/functions/save-result', {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify({
// //         sid,
// //         test_time: new Date().toISOString(),
// //         result,
// //         source: 'manual'
// //       })
// //     });

// //     const saveJson = await saveRes.json();
// //     log(`Saved to Neon: ${JSON.stringify(saveJson)}`);
// //     updateStatus('done');
// //   } catch (err) {
// //     log(`Error: ${err.message}`);
// //     updateStatus('error');
// //   }
// // }

// runBtn.addEventListener('click', runManualTest);


// document.getElementById('unsubscribeBtn').addEventListener('click', unsubscribe);
