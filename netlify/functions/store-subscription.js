import crypto from "node:crypto";
import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
client.on("error", (err) => console.error("Redis error:", err));

let connected;
async function getClient() {
  if (!connected) {
    connected = client.connect().catch((e) => {
      connected = undefined;
      throw e;
    });
  }
  await connected;
  return client;
}

function ok(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}

function bad(status, msg) {
  return {
    statusCode: status,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: msg
  };
}

export async function handler(event) {
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
  if (event.httpMethod !== "POST") return bad(405, "Method Not Allowed");

  if (!process.env.REDIS_URL) return bad(500, "REDIS_URL not configured");

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return bad(400, "Invalid JSON");
  }
  const sub = payload && payload.subscription;
  if (!sub || !sub.endpoint) return bad(400, "Missing subscription");

  const id = crypto.createHash("sha1").update(sub.endpoint).digest("hex");
  const key = `sub:${id}`;

  const db = await getClient();
  // Auto-expire in 30 days; refreshed on each POST from client
  await db.set(key, JSON.stringify(sub), { EX: 60 * 60 * 24 * 30 });

  return ok({ stored: true, id });
}
