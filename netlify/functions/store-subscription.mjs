import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST' };
  }

  const sub = JSON.parse(event.body || '{}');
  const endpoint   = sub.endpoint;
  const p256dh     = sub.keys?.p256dh;
  const auth       = sub.keys?.auth;
  const expiresRaw = sub.expirationTime ? new Date(sub.expirationTime) : null;
  const ua         = event.headers['user-agent'] || null;

  if (!endpoint || !p256dh || !auth) {
    return { statusCode: 400, body: 'Missing subscription fields' };
  }

  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, expiration_time, ua)
      VALUES (${endpoint}, ${p256dh}, ${auth}, ${expiresRaw}, ${ua})
      ON CONFLICT (endpoint) DO UPDATE
      SET p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          expiration_time = EXCLUDED.expiration_time,
          ua = EXCLUDED.ua,
          updated_at = now()
    `;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'DB error' };
  }
}



// const crypto = require("node:crypto");
// const { createClient } = require("redis");
// const dns = require("node:dns");
// dns.setDefaultResultOrder?.("ipv4first");

// const host = process.env.REDIS_HOST;
// const port = Number(process.env.REDIS_PORT);
// const username = process.env.REDIS_USER || "default";
// const password = process.env.REDIS_PASSWORD;
// const preferTLS = String(process.env.REDIS_TLS || "true").toLowerCase() === "true";

// async function connectRedis() {
//   const tryConnect = async (tls) => {
//     console.log(`[Redis] Attempting ${tls ? "TLS" : "non-TLS"} connection to ${host}:${port}`);
//     const client = createClient({
//       socket: {
//         host,
//         port,
//         tls,
//         servername: tls ? host : undefined,
//         connectTimeout: 2500
//       },
//       username,
//       password
//     });
//     client.on("error", (e) => console.error("[Redis error]", e));
//     await client.connect();
//     console.log("[Redis] Connected successfully");
//     return client;
//   };
//   try {
//     return await tryConnect(preferTLS);
//   } catch (e) {
//     const msg = String(e?.message || e);
//     console.warn("[Redis] Connection failed:", msg);
//     if (/packet length too long|wrong version number|handshake failure|EPROTO/i.test(msg)) {
//       console.warn("[Redis] Retrying with", !preferTLS ? "TLS" : "non-TLS");
//       return await tryConnect(!preferTLS);
//     }
//     throw e;
//   }
// }

// let connected;
// async function getClient() {
//   if (!connected) {
//     connected = connectRedis().catch((e) => {
//       connected = undefined;
//       throw e;
//     });
//   }
//   return await connected;
// }

// function resp(status, body, json = false) {
//   return {
//     statusCode: status,
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Content-Type": json ? "application/json" : "text/plain; charset=utf-8"
//     },
//     body: json ? JSON.stringify(body) : String(body)
//   };
// }

// // exports.handler = async (event) => {
// //   console.log("[Handler] store-subscription START");
// //   try {
// //     if (event.httpMethod === "OPTIONS") {
// //       console.log("[Handler] OPTIONS preflight");
// //       return {
// //         statusCode: 204,
// //         headers: {
// //           "Access-Control-Allow-Origin": "*",
// //           "Access-Control-Allow-Methods": "POST, OPTIONS",
// //           "Access-Control-Allow-Headers": "content-type"
// //         }
// //       };
// //     }
// //     if (event.httpMethod !== "POST") {
// //       console.warn("[Handler] Wrong method:", event.httpMethod);
// //       return resp(405, "Method Not Allowed");
// //     }
// //     if (!host || !port) return resp(500, "REDIS_HOST/REDIS_PORT not configured");
// //     if (!username || !password) return resp(500, "REDIS_USER/REDIS_PASSWORD not configured");

// //     console.log("[Handler] Parsing body…");
// //     let payload;
// //     try {
// //       payload = JSON.parse(event.body || "{}");
// //     } catch {
// //       return resp(400, "Invalid JSON");
// //     }
// //     const sub = payload?.subscription;
// //     if (!sub?.endpoint) return resp(400, "Missing subscription");

// //     console.log("[Handler] Connecting to Redis…");
// //     const db = await getClient();

// //     const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
// //     const key = `sub:${id}`;
// //     console.log(`[Handler] Writing key ${key}…`);

// //     const setPromise = db.set(key, JSON.stringify(sub), { EX: 60 * 60 * 24 * 30 });

// //     await Promise.race([
// //       setPromise,
// //       new Promise((_, rej) => setTimeout(() => rej(new Error("db.set timeout")), 4000))
// //     ]);

// //     console.log("[Handler] Stored subscription successfully");
// //     return resp(200, { stored: true, id }, true);
// //   } catch (e) {
// //     console.error("[Handler] Error:", e?.message || e);
// //     return resp(500, e?.message || String(e));
// //   }
// // };


// exports.handler = async (event) => {
//   if (event.httpMethod === "OPTIONS") {
//     return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods":"POST,OPTIONS", "Access-Control-Allow-Headers":"content-type" } };
//   }
//   if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

//   const { getStore } = await import("@netlify/blobs");
//   const store = getStore("subs"); // global, site-wide store

//   let payload; try { payload = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Invalid JSON" }; }
//   const sub = payload?.subscription;
//   if (!sub?.endpoint) return { statusCode: 400, body: "Missing subscription" };

//   const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
//   await store.setJSON(`sub:${id}`, sub); // quick and dirty

//   return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" }, body: JSON.stringify({ stored: true, id }) };
// };