// netlify/functions/export-results.mjs
import { neon } from '@neondatabase/serverless';

function esc(x) {
  if (x == null) return '';
  const s = String(x);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function handler(event) {
  const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
  const session_id = params.get('session_id');
  const from = params.get('from');
  const to = params.get('to');
  if (!session_id) return { statusCode: 400, body: 'session_id is required' };

  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`
      SELECT test_time, direction, goodput_bps, streams, duration_ms, sub_id, session_id
      FROM msak_results
      WHERE session_id = ${session_id}
        ${from ? sql`AND test_time >= ${new Date(from)}` : sql``}
        ${to ? sql`AND test_time <= ${new Date(to)}` : sql``}
      ORDER BY test_time ASC
    `;

    const header = ['test_time','direction','goodput_bps','streams','duration_ms','sub_id','session_id'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        new Date(r.test_time).toISOString(),
        r.direction,
        r.goodput_bps ?? '',
        r.streams ?? '',
        r.duration_ms ?? '',
        r.sub_id ?? '',
        r.session_id ?? ''
      ].map(esc).join(','));
    }

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': `attachment; filename="msak_results_${session_id}.csv"`
      },
      body: lines.join('\n')
    };
  } catch (e) {
    console.error('export-results error', e);
    return { statusCode: 500, body: e.message };
  }
}
