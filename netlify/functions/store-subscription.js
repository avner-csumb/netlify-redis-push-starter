import crypto from "node:crypto";
import { createClient } from "redis";
import dns from "node:dns";
dns.setDefaultResultOrder?.("ipv4first"); // avoid rare IPv6 stalls

const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT);
const client = createClient({
  socket: { host, port, tls: true, servername: host, connectTimeout: 5000 },
  username: process.env.REDIS_USER || "default",
  password: process.env.REDIS_PASSWORD,
});
client.on("error", (e) => console.error("Redis error:", e));

let connected;
async function getClient() {
  if (!connected) connected = client.connect().catch(e => (connected = undefined, Promise.reject(e)));
  await connected;
  return client;
}

function resp(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": status === 200 ? "application/json" : "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    },
    body: status === 200 ? JSON.stringify(body) : String(body)
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "content-type"
        }
      };
    }
    if (event.httpMethod !== "POST") return resp(405, "Method Not Allowed");
    if (!host || !port) return resp(500, "REDIS_HOST/REDIS_PORT not configured");

    const { subscription } = JSON.parse(event.body || "{}");
    if (!subscription?.endpoint) return resp(400, "Missing subscription");

    const db = await getClient();
    const id = crypto.createHash("sha1").update(subscription.endpoint).digest("hex");
    await db.set(`sub:${id}`, JSON.stringify(subscription), { EX: 60 * 60 * 24 * 30 });

    return resp(200, { stored: true, id });
  } catch (e) {
    console.error(e);
    return resp(500, e?.message || String(e));
  }
}


// import crypto from "node:crypto";
// import { createClient } from "redis";

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

// function ok(body) {
//   return {
//     statusCode: 200,
//     headers: {
//       "Content-Type": "application/json",
//       "Access-Control-Allow-Origin": "*"
//     },
//     body: JSON.stringify(body)
//   };
// }

// function bad(status, msg) {
//   return {
//     statusCode: status,
//     headers: { "Access-Control-Allow-Origin": "*" },
//     body: msg
//   };
// }

// export async function handler(event) {
//   if (event.httpMethod === "OPTIONS") {
//     return {
//       statusCode: 204,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "POST, OPTIONS",
//         "Access-Control-Allow-Headers": "content-type"
//       }
//     };
//   }
//   if (event.httpMethod !== "POST") return bad(405, "Method Not Allowed");

//   if (!process.env.REDIS_URL) return bad(500, "REDIS_URL not configured");

//   let payload;
//   try {
//     payload = JSON.parse(event.body || "{}");
//   } catch {
//     return bad(400, "Invalid JSON");
//   }
//   const sub = payload && payload.subscription;
//   if (!sub || !sub.endpoint) return bad(400, "Missing subscription");

//   const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
//   const key = `sub:${id}`;

//   const db = await getClient();
//   // Auto-expire in 30 days; refreshed on each POST from client
//   await db.set(key, JSON.stringify(sub), { EX: 60 * 60 * 24 * 30 });

//   return ok({ stored: true, id });
// }
