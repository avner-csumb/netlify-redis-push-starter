import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok:false, error:'Only POST' });

  let b;
  try { b = JSON.parse(event.body || '{}'); }
  catch { return json(400, { ok:false, error:'Invalid JSON' }); }

  const direction   = b.direction;
  const session_id  = b.session_id ?? null;
  const streams     = intOrNull(b.streams);
  const duration_ms = intOrNull(b.duration_ms);
  const result_json = b.result_json ?? null;

  // prefer client bps; else derive from Mbps on the payload
  const goodput_bps =
    numberOrNull(b.goodput_bps) ??
    (result_json && typeof result_json.goodput === 'number'
      ? Math.round(result_json.goodput * 1e6)
      : null);

  // only numeric sub_id
  const rawSid = b.sub_id ?? b.sid;
  const sub_id = numericOrNull(rawSid);

  if (!['download','upload'].includes(direction)) {
    return json(400, { ok:false, error:'Bad direction' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      INSERT INTO msak_results
        (sub_id, session_id, test_time, direction, goodput_bps, streams, duration_ms, result_json)
      VALUES
        (${sub_id}, ${session_id}, now(), ${direction}, ${goodput_bps}, ${streams}, ${duration_ms},
         ${result_json ? JSON.stringify(result_json) : null})
      RETURNING id, test_time, direction, goodput_bps
    `;
    return json(200, { ok:true, ...rows[0] });
  } catch (e) {
    console.error('save-result error', e);
    return json(500, { ok:false, error:String(e) });
  }
}

function json(statusCode, obj) {
  return { statusCode, headers:{'content-type':'application/json'}, body: JSON.stringify(obj) };
}
function numberOrNull(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
function intOrNull(v){ const n=Number(v); return Number.isInteger(n)?n:null; }
function numericOrNull(v){ if (v==null) return null; const s=String(v); return /^\d+$/.test(s)?Number(s):null; }


// // netlify/functions/save-result.mjs
// import { neon } from '@neondatabase/serverless';

// export async function handler(event) {
//   if (event.httpMethod !== 'POST') {
//     return json(405, { ok: false, error: 'Only POST' });
//   }

//   let b;
//   try {
//     b = JSON.parse(event.body || '{}');
//   } catch {
//     return json(400, { ok: false, error: 'Invalid JSON' });
//   }

//   const direction   = b.direction;
//   const session_id  = b.session_id ?? null;
//   const streams     = intOrNull(b.streams);
//   const duration_ms = intOrNull(b.duration_ms);
//   const result_json = b.result_json ?? null;

//   // Prefer explicit bps from client; else derive from result_json.goodput (Mbps)
//   const goodput_bps =
//     numberOrNull(b.goodput_bps) ??
//     (result_json && typeof result_json.goodput === 'number'
//       ? Math.round(result_json.goodput * 1e6)
//       : null);

//   // Only store sub_id if it's purely numeric
//   const rawSid = b.sub_id ?? b.sid;
//   const sub_id = numericOrNull(rawSid);

//   if (!['download', 'upload'].includes(direction)) {
//     return json(400, { ok: false, error: 'Bad direction' });
//   }

//   try {
//     const sql = neon(process.env.DATABASE_URL);
//     const rows = await sql`
//       INSERT INTO msak_results
//         (sub_id, session_id, test_time, direction, goodput_bps, streams, duration_ms, result_json)
//       VALUES
//         (${sub_id}, ${session_id}, now(), ${direction}, ${goodput_bps}, ${streams}, ${duration_ms},
//          ${result_json ? JSON.stringify(result_json) : null})
//       RETURNING id, test_time
//     `;
//     return json(200, { ok: true, id: rows[0].id, test_time: rows[0].test_time });
//   } catch (e) {
//     console.error('save-result error', e);
//     return json(500, { ok: false, error: String(e) });
//   }
// }

// /* ---------- helpers ---------- */
// function json(statusCode, obj) {
//   return {
//     statusCode,
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify(obj)
//   };
// }
// function numberOrNull(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// }
// function intOrNull(v) {
//   const n = Number(v);
//   return Number.isInteger(n) ? n : null;
// }
// function numericOrNull(v) {
//   if (v === null || v === undefined) return null;
//   const s = String(v);
//   return /^\d+$/.test(s) ? Number(s) : null;
// }
