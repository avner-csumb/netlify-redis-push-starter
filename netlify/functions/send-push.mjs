import { schedule } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_CONTACT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const handler = schedule('*/15 * * * *', async () => {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT id, endpoint, p256dh, auth FROM push_subscriptions`;

  for (const r of rows) {
    const sub = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };

    try {
      await webpush.sendNotification(sub, JSON.stringify({ type: 'RUN_TEST', ts: Date.now() }));
      await sql`UPDATE push_subscriptions SET last_push_at = now() WHERE id = ${r.id}`;
    } catch (err) {
      // Automatically remove stale subscriptions on 404/410, same behavior you had in Redis
      if (err.statusCode === 404 || err.statusCode === 410) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${r.id}`;
      } else {
        console.error('Push error for', r.id, err?.statusCode, err?.message);
      }
    }
  }

  // Optional: mirror Redis TTL by pruning old entries (30 days since last update)
  await sql`DELETE FROM push_subscriptions WHERE updated_at < now() - interval '30 days'`;

  return { statusCode: 200, body: 'push cycle done' };
});


// const { schedule } = require("@netlify/functions");
// const webpush = require("web-push");
// const { createClient } = require("redis");
// const dns = require("node:dns");
// dns.setDefaultResultOrder?.("ipv4first");

// // // netlify/functions/send-push.js
// // import { schedule } from "@netlify/functions";
// // import webpush from "web-push";
// // import { createClient } from "redis";
// // import dns from "node:dns";

// // // Prefer IPv4 first to avoid rare IPv6 stalls in serverless envs
// // dns.setDefaultResultOrder?.("ipv4first");

// // --- VAPID setup ---
// const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || "";
// const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
// const VAPID_CONTACT     = process.env.VAPID_CONTACT     || "mailto:you@example.com";
// webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// // --- Redis config (separate env vars) ---
// const host = process.env.REDIS_HOST;
// const port = Number(process.env.REDIS_PORT);
// const username = process.env.REDIS_USER || "default";
// const password = process.env.REDIS_PASSWORD;
// // Default to TLS; set REDIS_TLS=false if your endpoint is non-TLS
// const preferTLS = String(process.env.REDIS_TLS || "true").toLowerCase() === "true";

// // Build a Redis client, trying TLS first (or non-TLS) based on REDIS_TLS, then falling back.
// async function connectRedis() {
//   const tryConnect = async (tls) => {
//     const client = createClient({
//       socket: { host, port, tls, servername: tls ? host : undefined, connectTimeout: 2500 },
//       username,
//       password
//     });
//     client.on("error", (e) => console.error("Redis error:", e));
//     await client.connect();
//     return client;
//   };

//   try {
//     return await tryConnect(preferTLS);
//   } catch (e) {
//     const msg = String(e?.message || e);
//     // Fall back if it's clearly a TLS/protocol mismatch
//     if (/packet length too long|wrong version number|handshake failure|EPROTO/i.test(msg)) {
//       console.warn("TLS/protocol mismatch, retrying with", !preferTLS ? "TLS" : "non-TLS");
//       return await tryConnect(!preferTLS);
//     }
//     throw e;
//   }
// }

// // Cache the connection per invocation to avoid reconnecting
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

// async function* scanKeys(db, pattern) {
//   let cursor = "0";
//   do {
//     const { cursor: next, keys } = await db.scan(cursor, { MATCH: pattern, COUNT: 200 });
//     cursor = next;
//     for (const k of keys) yield k;
//   } while (cursor !== "0");
// }

// async function doSend() {
//   if (!host || !port) return { ok: false, reason: "redis-not-configured" };
//   if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { ok: false, reason: "vapid-not-configured" };

//   const db = await getClient();
//   let total = 0, sent = 0, failed = 0, removed = 0;

//   for await (const key of scanKeys(db, "sub:*")) {
//     total++;
//     const val = await db.get(key);
//     if (!val) continue;

//     let subscription;
//     try {
//       subscription = JSON.parse(val);
//     } catch {
//       await db.del(key);
//       removed++;
//       continue;
//     }

//     try {
//       await webpush.sendNotification(
//         subscription,
//         JSON.stringify({ type: "tick", ts: Date.now() }),
//         { TTL: 3600 }
//       );
//       sent++;
//     } catch (err) {
//       failed++;
//       // Clean up expired/invalid subscriptions
//       if (err?.statusCode === 404 || err?.statusCode === 410) {
//         await db.del(key);
//         removed++;
//       } else {
//         console.error("send error:", err?.statusCode, err?.message);
//       }
//     }
//   }

//   return { ok: true, total, sent, failed, removed };
// }

// // Runs every 15 minutes
// // export const handler = schedule("*/15 * * * *", async () => {
// //   try {
// //     const result = await doSend();
// //     return {
// //       statusCode: 200,
// //       body: JSON.stringify({ when: new Date().toISOString(), result })
// //     };
// //   } catch (e) {
// //     console.error(e);
// //     return { statusCode: 500, body: String(e?.message || e) };
// //   }
// // });

// exports.handler = schedule("*/15 * * * *", async () => {
//   const { getStore } = await import("@netlify/blobs");
//   const store = getStore("subs");

//   let token;
//   let sent=0, failed=0, removed=0;

//   for await (const entry of store.list({ prefix: "sub:" })) {
//     const sub = await store.getJSON(entry.key);
//     if (!sub) continue;
//     try {
//       await webpush.sendNotification(sub, JSON.stringify({ type: "tick", ts: Date.now() }), { TTL: 3600 });
//       sent++;
//     } catch (err) {
//       failed++;
//       if (err?.statusCode === 404 || err?.statusCode === 410) {
//         await store.delete(entry.key); removed++;
//       }
//     }
//   }

//   return { statusCode: 200, body: JSON.stringify({ sent, failed, removed }) };
// });



// // import { schedule } from "@netlify/functions";
// // import webpush from "web-push";
// // import { createClient } from "redis";
// // import dns from "node:dns";
// // dns.setDefaultResultOrder?.("ipv4first");

// // const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || "";
// // const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
// // const VAPID_CONTACT     = process.env.VAPID_CONTACT     || "mailto:you@example.com";
// // webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// // const host = process.env.REDIS_HOST;
// // const port = Number(process.env.REDIS_PORT);
// // const client = createClient({
// //   socket: { host, port, tls: true, servername: host, connectTimeout: 5000 },
// //   username: process.env.REDIS_USER || "default",
// //   password: process.env.REDIS_PASSWORD,
// // });
// // client.on("error", (err) => console.error("Redis error:", err));

// // let connected;
// // async function getClient() {
// //   if (!connected) connected = client.connect().catch(e => (connected = undefined, Promise.reject(e)));
// //   await connected;
// //   return client;
// // }

// // async function* scanKeys(db, pattern) {
// //   let cursor = "0";
// //   do {
// //     const { cursor: next, keys } = await db.scan(cursor, { MATCH: pattern, COUNT: 200 });
// //     cursor = next;
// //     for (const k of keys) yield k;
// //   } while (cursor !== "0");
// // }

// // async function doSend() {
// //   if (!host || !port) return { ok: false, reason: "redis-not-configured" };
// //   if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { ok: false, reason: "vapid-not-configured" };

// //   const db = await getClient();
// //   let total = 0, sent = 0, failed = 0, removed = 0;

// //   for await (const key of scanKeys(db, "sub:*")) {
// //     total++;
// //     const val = await db.get(key);
// //     if (!val) continue;
// //     let subscription;
// //     try { subscription = JSON.parse(val); } catch { await db.del(key); removed++; continue; }

// //     try {
// //       await webpush.sendNotification(
// //         subscription,
// //         JSON.stringify({ type: "tick", ts: Date.now() }),
// //         { TTL: 3600 }
// //       );
// //       sent++;
// //     } catch (err) {
// //       failed++;
// //       if (err?.statusCode === 404 || err?.statusCode === 410) {
// //         await db.del(key); removed++;
// //       } else {
// //         console.error("send error:", err?.statusCode, err?.message);
// //       }
// //     }
// //   }
// //   return { ok: true, total, sent, failed, removed };
// // }

// // export const handler = schedule("*/15 * * * *", async () => {
// //   const result = await doSend();
// //   return { statusCode: 200, body: JSON.stringify({ when: new Date().toISOString(), result }) };
// // });


// // // import { schedule } from "@netlify/functions";
// // // import webpush from "web-push";
// // // import { createClient } from "redis";

// // // // Configure VAPID
// // // const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
// // // const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
// // // const contact = process.env.VAPID_CONTACT || "mailto:you@example.com";

// // // webpush.setVapidDetails(contact, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// // // const client = createClient({ url: process.env.REDIS_URL });
// // // client.on("error", (err) => console.error("Redis error:", err));

// // // let connected;
// // // async function getClient() {
// // //   if (!connected) {
// // //     connected = client.connect().catch((e) => {
// // //       connected = undefined;
// // //       throw e;
// // //     });
// // //   }
// // //   await connected;
// // //   return client;
// // // }

// // // async function* scanKeys(db, pattern) {
// // //   let cursor = "0";
// // //   do {
// // //     const res = await db.scan(cursor, { MATCH: pattern, COUNT: 200 });
// // //     cursor = res.cursor;
// // //     for (const k of res.keys) yield k;
// // //   } while (cursor !== "0");
// // // }

// // // async function sendAll() {
// // //   if (!process.env.REDIS_URL) {
// // //     console.warn("REDIS_URL not set; skipping send.");
// // //     return { ok: false, reason: "no-redis" };
// // //   }
// // //   if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
// // //     console.warn("VAPID keys not set; skipping send.");
// // //     return { ok: false, reason: "no-vapid" };
// // //   }

// // //   const db = await getClient();
// // //   let total = 0, removed = 0, sent = 0, failed = 0;

// // //   for await (const key of scanKeys(db, "sub:*")) {
// // //     total++;
// // //     const val = await db.get(key);
// // //     if (!val) continue;
// // //     let subscription;
// // //     try {
// // //       subscription = JSON.parse(val);
// // //     } catch {
// // //       await db.del(key);
// // //       removed++;
// // //       continue;
// // //     }

// // //     try {
// // //       await webpush.sendNotification(
// // //         subscription,
// // //         JSON.stringify({ type: "tick", ts: Date.now() }),
// // //         { TTL: 3600 }
// // //       );
// // //       sent++;
// // //     } catch (err) {
// // //       failed++;
// // //       if (err.statusCode === 404 || err.statusCode === 410) {
// // //         await db.del(key);
// // //         removed++;
// // //       } else {
// // //         console.error("send error:", err?.statusCode, err?.message);
// // //       }
// // //     }
// // //   }
// // //   return { ok: true, total, sent, failed, removed };
// // // }

// // // export const handler = schedule("*/15 * * * *", async () => {
// // //   const result = await sendAll();
// // //   return {
// // //     statusCode: 200,
// // //     body: JSON.stringify({ when: new Date().toISOString(), result })
// // //   };
// // // });
