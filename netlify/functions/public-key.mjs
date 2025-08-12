export async function handler() {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicKey: process.env.VAPID_PUBLIC_KEY })
  };
}


// export async function handler() {
//   const pub = process.env.VAPID_PUBLIC_KEY || "";
//   return {
//     statusCode: 200,
//     headers: {
//       "Content-Type": "application/json",
//       "Cache-Control": "no-store",
//       "Access-Control-Allow-Origin": "*"
//     },
//     body: JSON.stringify({ publicKey: pub })
//   };
// }
