// src/app/api/healthz/route.ts
export async function GET() {
  return new Response("ok");
}
