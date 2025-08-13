// // /netlify/functions/remove-subscription.mjs
// import { sql } from '@neondatabase/serverless'; // or your chosen client
// import { buffer } from 'micro'  // optional if using raw body parsing in Netlify
// export const config = { path: '/.netlify/functions/remove-subscription' };

// export default async (req, context) => {
//   try {
//     const { endpoint } = await req.json();

//     if (!endpoint) {
//       return new Response(
//         JSON.stringify({ error: 'Missing endpoint' }),
//         { status: 400 }
//       );
//     }

//     const result = await sql`
//       DELETE FROM push_subscriptions
//       WHERE endpoint = ${endpoint}
//     `;

//     return new Response(
//       JSON.stringify({ ok: true, deleted: result.count }),
//       { status: 200 }
//     );
//   } catch (err) {
//     console.error('Unsubscribe error:', err);
//     return new Response(
//       JSON.stringify({ error: 'Unsubscribe failed' }),
//       { status: 500 }
//     );
//   }
// };


// netlify/functions/remove-subscription.mjs
import { sql } from '@neondatabase/serverless';

export const handler = async (event) => {
  try {
    const { endpoint } = JSON.parse(event.body || '{}');
    if (!endpoint) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing endpoint' }) };
    }

    // Delete by endpoint (unique)
    const result = await sql`
      DELETE FROM push_subscriptions
      WHERE endpoint = ${endpoint}
    `;

    // neon's tagged template returns an object with .count
    const deleted = result.count ?? 0;

    return { statusCode: 200, body: JSON.stringify({ ok: true, deleted }) };
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unsubscribe failed' }) };
  }
};
