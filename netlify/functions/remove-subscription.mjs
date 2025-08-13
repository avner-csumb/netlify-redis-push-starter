// /netlify/functions/remove-subscription.mjs
import { sql } from '@neondatabase/serverless'; // or your chosen client
import { buffer } from 'micro'  // optional if using raw body parsing in Netlify
export const config = { path: '/.netlify/functions/remove-subscription' };

export default async (req, context) => {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint' }),
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM push_subscriptions
      WHERE endpoint = ${endpoint}
    `;

    return new Response(
      JSON.stringify({ ok: true, deleted: result.count }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return new Response(
      JSON.stringify({ error: 'Unsubscribe failed' }),
      { status: 500 }
    );
  }
};
