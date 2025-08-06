export async function handler() {
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ publicKey: pub })
  };
}
