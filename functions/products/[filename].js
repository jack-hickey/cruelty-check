export async function onRequest(context) {
  const { env, params } = context;
  const filename = params.filename;

  if (!filename) return new Response("File not specified", { status: 400 });

  const object = await env.R2_BUCKET.get(filename);

  if (!object) return new Response("File not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    }
  });
}
