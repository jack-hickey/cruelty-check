export async function onRequest(context) {
  const { params, env } = context
  const key = params.path.join('/') // reconstructs the R2 object key

  const object = await env.R2_BUCKET.get(key)
  if (!object) return new Response("Not Found", { status: 404 })

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  })
}
