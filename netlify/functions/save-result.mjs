import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Only POST' };

  let b;
  try { b = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { direction, session_id, goodput_bps, streams, duration_ms, result_json } = b;

  // Accept both names coming from client, but coerce only numeric
  const rawSid = b.sub_id ?? b.sid;
  const sub_id = Number.isFinite(Number(rawSid)) ? Number(rawSid) : null;

  if (!direction || !['download','upload'].includes(direction)) {
    return { statusCode: 400, body: 'Bad direction' };
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`
      INSERT INTO msak_results (sub_id, session_id, test_time, direction, goodput_bps, streams, duration_ms, result_json)
      VALUES (${sub_id}, ${session_id ?? null}, now(), ${direction},
              ${goodput_bps ?? null}, ${streams ?? null}, ${duration_ms ?? null},
              ${result_json ? JSON.stringify(result_json) : null})
    `;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('save-result error', e);          // <-- keep this
    return { statusCode: 500, body: String(e) };    // <-- return text so client can log it
  }
}


// import { neon } from '@neondatabase/serverless';

// export async function handler(event) {
//   if (event.httpMethod !== 'POST') {
//     return { statusCode: 405, body: 'Only POST' };
//   }

//   let b;
//   try { b = JSON.parse(event.body || '{}'); }
//   catch { return { statusCode: 400, body: 'Invalid JSON' }; }

//   const {
//     direction,            // 'download' | 'upload'
//     sid, sub_id,          // optional subscriber id (either name is fine)
//     session_id,           // <-- new
//     goodput_bps,
//     streams,
//     duration_ms,
//     result_json
//   } = b;

//   if (!direction || !['download','upload'].includes(direction)) {
//     return { statusCode: 400, body: 'Bad direction' };
//   }

//   const sql = neon(process.env.DATABASE_URL);
//   try {
//     await sql`
//       INSERT INTO msak_results
//         (sub_id, session_id, test_time, direction, goodput_bps, streams, duration_ms, result_json)
//       VALUES
//         (${sub_id ?? sid ?? null},
//          ${session_id ?? null},
//          now(),
//          ${direction},
//          ${goodput_bps ?? null},
//          ${streams ?? null},
//          ${duration_ms ?? null},
//          ${result_json ? JSON.stringify(result_json) : null})
//     `;
//     return { statusCode: 200, body: JSON.stringify({ ok: true }) };
//   } catch (e) {
//     console.error('save-result error', e);
//     return { statusCode: 500, body: 'DB error' };
//   }
// }
