const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');
function log(...args) { logEl.textContent += args.join(' ') + "\n"; }

async function getVapidPublicKey() {
  const res = await fetch('/.netlify/functions/public-key');
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error('Missing VAPID_PUBLIC_KEY on server');
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
      body: JSON.stringify({ subscription: sub })
    });
    if (!res.ok) throw new Error('Failed to store subscription');
    const data = await res.json();
    statusEl.textContent = 'subscribed';
    log('Stored in Redis:', JSON.stringify(data));
  } catch (e) {
    statusEl.textContent = 'error';
    log('Subscribe error:', e.message);
    alert(e.message);
  }
}

document.getElementById('subscribeBtn').addEventListener('click', subscribe);

log('Ready. Click "Subscribe to Push".');
