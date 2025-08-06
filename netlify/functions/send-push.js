import { schedule } from "@netlify/functions";
import webpush from "web-push";
import { createClient } from "redis";
import dns from "node:dns";
dns.setDefaultResultOrder?.("ipv4first");

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_CONTACT     = process.env.VAPID_CONTACT     || "mailto:you@example.com";
webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT);
const client = createClient({
  socket: { host, port, tls: true, servername: host, connectTimeout: 5000 },
  username: process.env.REDIS_USER || "default",
  password: process.env.REDIS_PASSWORD,
});
client.on("error", (err) => console.error("Redis error:", err));

let connected;
async function getClient() {
  if (!connected) connected = client.connect().catch(e => (connected = undefined, Promise.reject(e)));
  await connected;
  return client;
}

async function* scanKeys(db, pattern) {
  let cursor = "0";
  do {
    const { cursor: next, keys } = await db.scan(cursor, { MATCH: pattern, COUNT: 200 });
    cursor = next;
    for (const k of keys) yield k;
  } while (cursor !== "0");
}

async function doSend() {
  if (!host || !port) return { ok: false, reason: "redis-not-configured" };
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { ok: false, reason: "vapid-not-configured" };

  const db = await getClient();
  let total = 0, sent = 0, failed = 0, removed = 0;

  for await (const key of scanKeys(db, "sub:*")) {
    total++;
    const val = await db.get(key);
    if (!val) continue;
    let subscription;
    try { subscription = JSON.parse(val); } catch { await db.del(key); removed++; continue; }

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ type: "tick", ts: Date.now() }),
        { TTL: 3600 }
      );
      sent++;
    } catch (err) {
      failed++;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.del(key); removed++;
      } else {
        console.error("send error:", err?.statusCode, err?.message);
      }
    }
  }
  return { ok: true, total, sent, failed, removed };
}

export const handler = schedule("*/15 * * * *", async () => {
  const result = await doSend();
  return { statusCode: 200, body: JSON.stringify({ when: new Date().toISOString(), result }) };
});


// import { schedule } from "@netlify/functions";
// import webpush from "web-push";
// import { createClient } from "redis";

// // Configure VAPID
// const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
// const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
// const contact = process.env.VAPID_CONTACT || "mailto:you@example.com";

// webpush.setVapidDetails(contact, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// const client = createClient({ url: process.env.REDIS_URL });
// client.on("error", (err) => console.error("Redis error:", err));

// let connected;
// async function getClient() {
//   if (!connected) {
//     connected = client.connect().catch((e) => {
//       connected = undefined;
//       throw e;
//     });
//   }
//   await connected;
//   return client;
// }

// async function* scanKeys(db, pattern) {
//   let cursor = "0";
//   do {
//     const res = await db.scan(cursor, { MATCH: pattern, COUNT: 200 });
//     cursor = res.cursor;
//     for (const k of res.keys) yield k;
//   } while (cursor !== "0");
// }

// async function sendAll() {
//   if (!process.env.REDIS_URL) {
//     console.warn("REDIS_URL not set; skipping send.");
//     return { ok: false, reason: "no-redis" };
//   }
//   if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
//     console.warn("VAPID keys not set; skipping send.");
//     return { ok: false, reason: "no-vapid" };
//   }

//   const db = await getClient();
//   let total = 0, removed = 0, sent = 0, failed = 0;

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
//       if (err.statusCode === 404 || err.statusCode === 410) {
//         await db.del(key);
//         removed++;
//       } else {
//         console.error("send error:", err?.statusCode, err?.message);
//       }
//     }
//   }
//   return { ok: true, total, sent, failed, removed };
// }

// export const handler = schedule("*/15 * * * *", async () => {
//   const result = await sendAll();
//   return {
//     statusCode: 200,
//     body: JSON.stringify({ when: new Date().toISOString(), result })
//   };
// });
