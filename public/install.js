let deferredPrompt;
const btn = document.getElementById('installBtn');
if (btn) btn.hidden = true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btn) btn.hidden = false;
});

if (btn) {
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    btn.disabled = true;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.disabled = false;
    btn.hidden = true;
    console.log('PWA install choice:', choice);
  });
}

if (window.Notification) {
  console.log('Notification.permission =', Notification.permission);
}
