export async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const filename = url.pathname.replace("/images/", "");

	console.log(filename);

  if (!filename) return new Response("File not specified", { status: 400 });

  const object = await env.MY_R2_BUCKET.get(filename);

  if (!object) return new Response("File not found", { status: 404 });
	console.log(object);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
