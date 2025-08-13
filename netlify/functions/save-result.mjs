import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST' };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { direction, sid, goodput_bps, streams, duration_ms, result_json } = body;
  if (!direction || !['download','upload'].includes(direction)) {
    return { statusCode: 400, body: 'Bad direction' };
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`
      INSERT INTO msak_results (sub_id, direction, goodput_bps, streams, duration_ms, result_json)
      VALUES (${sid || null}, ${direction}, ${goodput_bps}, ${streams}, ${duration_ms}, ${result_json ? JSON.stringify(result_json) : null})
    `;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('save-result error', e);
    return { statusCode: 500, body: 'DB error' };
  }
}
