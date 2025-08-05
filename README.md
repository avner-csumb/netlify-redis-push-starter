# Netlify + Redis Cloud + Web Push Starter

Minimal starter that:
- Hosts a PWA on Netlify
- Stores Web Push subscriptions in Redis Cloud
- Sends a push to all subscribers every 15 minutes using Netlify Scheduled Functions
- Service Worker receives the push and shows a notification

## 1) Prereqs

- Node 18+
- Netlify account (Free/Starter is fine)
- Redis Cloud free database (get the `rediss://` connection URL)
- Generate VAPID keys:
  ```bash
  npx web-push generate-vapid-keys
  ```

## 2) Configure environment variables (Netlify dashboard)

- `REDIS_URL` — e.g. `rediss://default:password@hostname:port`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- (optional) `VAPID_CONTACT` — e.g. `mailto:you@example.com`

## 3) Install and run locally

```bash
npm i -g netlify-cli
npm i
netlify dev
```
Visit http://localhost:8888 and click **Subscribe to Push**.

> Local push delivery requires a real browser push service, so you might want to deploy to Netlify to test end-to-end.

## 4) Deploy

- Connect the repo to Netlify
- Deploy
- In **Site settings → Functions → Scheduled functions**, confirm `send-push` is scheduled (*/15 * * * *).

## Notes

- The scheduled function uses the `@netlify/functions` `schedule()` helper; no extra cron config is needed in `netlify.toml`.
- The Service Worker shows a notification and posts a message to open tabs when a push arrives.
- Stale subscriptions (HTTP 404/410) are removed automatically.
- Keys in Redis auto-expire in 30 days and are refreshed on each subscribe call.

## File map

```
public/
  index.html
  app.js
  service-worker.js
  manifest.webmanifest
netlify/functions/
  public-key.js
  store-subscription.js
  send-push.js   # scheduled every 15 minutes
netlify.toml
package.json
```
