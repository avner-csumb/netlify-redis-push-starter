// netlify/functions/check-subscription.mjs
import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Only POST' };
  let b; try { b = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }
  const { endpoint } = b;
  if (!endpoint) return { statusCode: 400, body: 'endpoint required' };

  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`
      SELECT id, app_expires_at, now() AS now
      FROM push_subscriptions
      WHERE endpoint = ${endpoint}
    `;
    if (rows.length === 0) {
      return { statusCode: 200, headers: {'content-type':'application/json'}, body: JSON.stringify({ found:false, expired:true }) };
    }
    const r = rows[0];
    const expired = r.app_expires_at ? new Date(r.app_expires_at) <= new Date(r.now) : false;
    return {
      statusCode: 200,
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ found:true, expired, id:r.id, app_expires_at:r.app_expires_at })
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}
