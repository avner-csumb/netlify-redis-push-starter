// netlify/functions/store-subscription.mjs
import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const endpoint   = payload.endpoint;
  const p256dh     = payload.keys?.p256dh;
  const auth       = payload.keys?.auth;
  const expiresRaw = payload.expirationTime ? new Date(payload.expirationTime) : null;
  const ttlHours   = Number(payload.ttlHours ?? 0);
  const ua         = event.headers['user-agent'] || null;

  if (!endpoint || !p256dh || !auth) {
    return { statusCode: 400, body: 'Missing subscription fields' };
  }

  // Compute app-level expiry (NULL = persistent)
  const appExpiresAt = ttlHours > 0
    ? new Date(Date.now() + ttlHours * 3600 * 1000)
    : null;

  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, expiration_time, ua, app_expires_at)
      VALUES (${endpoint}, ${p256dh}, ${auth}, ${expiresRaw}, ${ua}, ${appExpiresAt})
      ON CONFLICT (endpoint) DO UPDATE
      SET p256dh = EXCLUDED.p256dh,
          auth   = EXCLUDED.auth,
          expiration_time = EXCLUDED.expiration_time,
          ua     = EXCLUDED.ua,
          app_expires_at = EXCLUDED.app_expires_at,
          updated_at = now()
    `;
    
    
    // return { statusCode: 200, body: JSON.stringify({ ok: true, app_expires_at: appExpiresAt }) };
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, id: rows[0].id, app_expires_at: rows[0].app_expires_at })
    };



  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'DB error' };
  }
}

