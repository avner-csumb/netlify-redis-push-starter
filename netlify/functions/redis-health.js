import { createClient } from "redis";
import dns from "node:dns";
dns.setDefaultResultOrder?.("ipv4first");

export async function handler() {
  try {
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT);
    if (!host || !port) return { statusCode: 500, body: "REDIS_HOST/REDIS_PORT not configured" };

    const client = createClient({
      socket: { host, port, tls: true, servername: host, connectTimeout: 5000 },
      username: process.env.REDIS_USER || "default",
      password: process.env.REDIS_PASSWORD,
    });
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return { statusCode: 200, body: `OK ${pong}` };
  } catch (e) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
}


// import { createClient } from 'redis';
// import dns from 'node:dns';
// dns.setDefaultResultOrder?.('ipv4first'); // avoid IPv6 stalls

// function normalize(u="") {
//   return u.replace(/^redis\+tls:\/\//i, "rediss://")
//           .replace(/^redis-ssl:\/\//i, "rediss://")
//           .replace(/^tls:\/\//i, "rediss://");
// }

// export async function handler() {
//   try {
//     const url = normalize(process.env.REDIS_URL);
//     if (!url) return { statusCode: 500, body: "REDIS_URL not configured" };

//     const client = createClient({ url, socket: { tls: true, connectTimeout: 5000 } });
//     await client.connect();
//     const pong = await client.ping();
//     await client.quit();
//     return { statusCode: 200, body: `OK ${pong}` };
//   } catch (e) {
//     return { statusCode: 500, body: String(e?.message || e) };
//   }
// }
