const crypto = require("node:crypto");
const { createClient } = require("redis");
const dns = require("node:dns");
dns.setDefaultResultOrder?.("ipv4first");

const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT);
const username = process.env.REDIS_USER || "default";
const password = process.env.REDIS_PASSWORD;
const preferTLS = String(process.env.REDIS_TLS || "true").toLowerCase() === "true";


exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ ok: true, note: "short-circuit" })
  };
};


async function connectRedis() {
  const tryConnect = async (tls) => {
    const client = createClient({
      socket: { host, port, tls, servername: tls ? host : undefined, connectTimeout: 2500 },
      username, password
    });
    client.on("error", (e) => console.error("Redis error:", e));
    await client.connect();
    return client;
  };
  try { return await tryConnect(preferTLS); }
  catch (e) {
    const msg = String(e?.message || e);
    if (/packet length too long|wrong version number|handshake failure|EPROTO/i.test(msg)) {
      console.warn("TLS/protocol mismatch, retrying with", !preferTLS ? "TLS" : "non-TLS");
      return await tryConnect(!preferTLS);
    }
    throw e;
  }
}

let connected;
async function getClient() {
  if (!connected) connected = connectRedis().catch(e => (connected = undefined, Promise.reject(e)));
  return await connected;
}

function resp(status, body, json=false){
  return {
    statusCode: status,
    headers: { "Access-Control-Allow-Origin":"*", "Content-Type": json ? "application/json" : "text/plain; charset=utf-8" },
    body: json ? JSON.stringify(body) : String(body)
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin":"*",
          "Access-Control-Allow-Methods":"POST, OPTIONS",
          "Access-Control-Allow-Headers":"content-type"
        }
      };
    }
    if (event.httpMethod !== "POST") return resp(405, "Method Not Allowed");
    if (!host || !port) return resp(500, "REDIS_HOST/REDIS_PORT not configured");
    if (!username || !password) return resp(500, "REDIS_USER/REDIS_PASSWORD not configured");

    let payload;
    try { payload = JSON.parse(event.body || "{}"); } catch { return resp(400, "Invalid JSON"); }
    const sub = payload?.subscription;
    if (!sub?.endpoint) return resp(400, "Missing subscription");

    const db = await getClient();

    const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
    const key = `sub:${id}`;
    const setPromise = db.set(key, JSON.stringify(sub), { EX: 60 * 60 * 24 * 30 });

    // 👇 Guard so we return 500 with a clear message instead of 504
    await Promise.race([
      setPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("db.set timeout")), 4000))
    ]);

    return resp(200, { stored:true, id }, true);
  } catch (e) {
    console.error("store-sub error:", e?.message || e);
    return resp(500, e?.message || String(e));
  }
};


// // netlify/functions/store-subscription.js
// import crypto from "node:crypto";
// import { createClient } from "redis";
// import dns from "node:dns";

// // Prefer IPv4 first to avoid rare IPv6 stalls in serverless envs
// dns.setDefaultResultOrder?.("ipv4first");

// /** Build a Redis client, trying TLS first (or non-TLS) based on REDIS_TLS, then falling back. */
// const host = process.env.REDIS_HOST;
// const port = Number(process.env.REDIS_PORT);
// const username = process.env.REDIS_USER || "default";
// const password = process.env.REDIS_PASSWORD;
// const preferTLS = String(process.env.REDIS_TLS || "true").toLowerCase() === "true";


// console.log("store-sub BOOT");   // module loaded

// export async function handler(event) {
//   console.log("store-sub START", { method: event.httpMethod, t: Date.now() }); // handler entered
//   // TEMP: short-circuit to prove the function runs and responds quickly
//   return {
//     statusCode: 200,
//     headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
//     body: JSON.stringify({ ok: true, note: "short-circuit" })
//   };
// }



// async function connectRedis() {
//   const tryConnect = async (tls) => {
//     const client = createClient({
//       socket: {
//         host,
//         port,
//         tls,
//         servername: tls ? host : undefined, // SNI for TLS endpoints
//         connectTimeout: 2500
//       },
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

// function resp(status, body, contentType = "text/plain; charset=utf-8") {
//   const isJson = status === 200 && typeof body !== "string";
//   return {
//     statusCode: status,
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Content-Type": isJson ? "application/json" : contentType
//     },
//     body: isJson ? JSON.stringify(body) : String(body)
//   };
// }

// export async function handler(event) {
//   try {
//     // CORS preflight
//     if (event.httpMethod === "OPTIONS") {
//       return {
//         statusCode: 204,
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//           "Access-Control-Allow-Methods": "POST, OPTIONS",
//           "Access-Control-Allow-Headers": "content-type"
//         }
//       };
//     }

//     if (event.httpMethod !== "POST") {
//       return resp(405, "Method Not Allowed");
//     }

//     if (!host || !port) {
//       return resp(500, "REDIS_HOST/REDIS_PORT not configured");
//     }
//     if (!username || !password) {
//       return resp(500, "REDIS_USER/REDIS_PASSWORD not configured");
//     }

//     let payload;
//     try {
//       payload = JSON.parse(event.body || "{}");
//     } catch {
//       return resp(400, "Invalid JSON");
//     }

//     const sub = payload?.subscription;
//     if (!sub?.endpoint) {
//       return resp(400, "Missing subscription");
//     }

//     // Stable id per endpoint
//     const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
//     const key = `sub:${id}`;

//     const db = await getClient();
//     // Auto-expire in 30 days; refresh when user re-subscribes
//     await db.set(key, JSON.stringify(sub), { EX: 60 * 60 * 24 * 30 });

//     return resp(200, { stored: true, id });
//   } catch (e) {
//     console.error(e);
//     return resp(500, e?.message || String(e));
//   }
// }


// // import crypto from "node:crypto";
// // import { createClient } from "redis";
// // import dns from "node:dns";
// // dns.setDefaultResultOrder?.("ipv4first"); // avoid rare IPv6 stalls

// // const host = process.env.REDIS_HOST;
// // const port = Number(process.env.REDIS_PORT);
// // const client = createClient({
// //   socket: { host, port, tls: true, servername: host, connectTimeout: 5000 },
// //   username: process.env.REDIS_USER || "default",
// //   password: process.env.REDIS_PASSWORD,
// // });
// // client.on("error", (e) => console.error("Redis error:", e));

// // let connected;
// // async function getClient() {
// //   if (!connected) connected = client.connect().catch(e => (connected = undefined, Promise.reject(e)));
// //   await connected;
// //   return client;
// // }

// // function resp(status, body) {
// //   return {
// //     statusCode: status,
// //     headers: {
// //       "Content-Type": status === 200 ? "application/json" : "text/plain; charset=utf-8",
// //       "Access-Control-Allow-Origin": "*"
// //     },
// //     body: status === 200 ? JSON.stringify(body) : String(body)
// //   };
// // }

// // export async function handler(event) {
// //   try {
// //     if (event.httpMethod === "OPTIONS") {
// //       return {
// //         statusCode: 204,
// //         headers: {
// //           "Access-Control-Allow-Origin": "*",
// //           "Access-Control-Allow-Methods": "POST, OPTIONS",
// //           "Access-Control-Allow-Headers": "content-type"
// //         }
// //       };
// //     }
// //     if (event.httpMethod !== "POST") return resp(405, "Method Not Allowed");
// //     if (!host || !port) return resp(500, "REDIS_HOST/REDIS_PORT not configured");

// //     const { subscription } = JSON.parse(event.body || "{}");
// //     if (!subscription?.endpoint) return resp(400, "Missing subscription");

// //     const db = await getClient();
// //     const id = crypto.createHash("sha1").update(subscription.endpoint).digest("hex");
// //     await db.set(`sub:${id}`, JSON.stringify(subscription), { EX: 60 * 60 * 24 * 30 });

// //     return resp(200, { stored: true, id });
// //   } catch (e) {
// //     console.error(e);
// //     return resp(500, e?.message || String(e));
// //   }
// // }


// // // import crypto from "node:crypto";
// // // import { createClient } from "redis";

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

// // // function ok(body) {
// // //   return {
// // //     statusCode: 200,
// // //     headers: {
// // //       "Content-Type": "application/json",
// // //       "Access-Control-Allow-Origin": "*"
// // //     },
// // //     body: JSON.stringify(body)
// // //   };
// // // }

// // // function bad(status, msg) {
// // //   return {
// // //     statusCode: status,
// // //     headers: { "Access-Control-Allow-Origin": "*" },
// // //     body: msg
// // //   };
// // // }

// // // export async function handler(event) {
// // //   if (event.httpMethod === "OPTIONS") {
// // //     return {
// // //       statusCode: 204,
// // //       headers: {
// // //         "Access-Control-Allow-Origin": "*",
// // //         "Access-Control-Allow-Methods": "POST, OPTIONS",
// // //         "Access-Control-Allow-Headers": "content-type"
// // //       }
// // //     };
// // //   }
// // //   if (event.httpMethod !== "POST") return bad(405, "Method Not Allowed");

// // //   if (!process.env.REDIS_URL) return bad(500, "REDIS_URL not configured");

// // //   let payload;
// // //   try {
// // //     payload = JSON.parse(event.body || "{}");
// // //   } catch {
// // //     return bad(400, "Invalid JSON");
// // //   }
// // //   const sub = payload && payload.subscription;
// // //   if (!sub || !sub.endpoint) return bad(400, "Missing subscription");

// // //   const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
// // //   const key = `sub:${id}`;

// // //   const db = await getClient();
// // //   // Auto-expire in 30 days; refreshed on each POST from client
// // //   await db.set(key, JSON.stringify(sub), { EX: 60 * 60 * 24 * 30 });

// // //   return ok({ stored: true, id });
// // // }
