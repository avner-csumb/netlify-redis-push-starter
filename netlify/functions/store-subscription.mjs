// netlify/functions/store-subscription.mjs
import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  // Accept BOTH shapes:
  // - flat:   { endpoint, p256dh, auth, expiration_time }
  // - nested: { endpoint, keys:{p256dh,auth}, expirationTime }
  const endpoint        = body.endpoint;
  const p256dh          = body.p256dh ?? body.keys?.p256dh;
  const auth            = body.auth    ?? body.keys?.auth;
  const expiration_time = body.expiration_time ?? body.expirationTime ?? null;
  const ttlHours        = Number.isFinite(Number(body.ttlHours)) ? Number(body.ttlHours) : 0;

  // Prefer client-provided UA if present; fall back to request header
  const ua = body.ua ?? event.headers?.['user-agent'] ?? null;

  if (!endpoint || !p256dh || !auth) {
    return json(400, { ok: false, error: 'Invalid subscription: endpoint/p256dh/auth required' });
  }

  const expiresRaw = expiration_time ? new Date(expiration_time) : null;

  // Compute app-level expiry (NULL = persistent)
  const appExpiresAt = ttlHours > 0
    ? new Date(Date.now() + ttlHours * 3600_000) // 1h = 3600_000 ms
    : null;

  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, expiration_time, ua, app_expires_at)
      VALUES (${endpoint}, ${p256dh}, ${auth}, ${expiresRaw}, ${ua}, ${appExpiresAt})
      ON CONFLICT (endpoint) DO UPDATE
      SET p256dh = EXCLUDED.p256dh,
          auth   = EXCLUDED.auth,
          expiration_time = EXCLUDED.expiration_time,
          ua     = EXCLUDED.ua,
          app_expires_at = EXCLUDED.app_expires_at,
          updated_at = now()
      RETURNING id, app_expires_at;
    `;

    return json(200, { ok: true, id: rows[0].id, app_expires_at: rows[0].app_expires_at });
  } catch (e) {
    console.error('store-subscription error', e);
    return json(500, { ok: false, error: 'DB error' });
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
