export async function onRequest(context) {
  const { request, env, params, waitUntil } = context;

  const imageName = params?.image || 'default.png';

  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  }

  try {
    const r2Object = await env.R2_BUCKET.get(imageName);

    if (!r2Object) {
      return new Response('Image not found', { status: 404 });
    }

    const arrayBuffer = await r2Object.arrayBuffer();

    response = new Response(arrayBuffer, {
      headers: {
        'Content-Type': r2Object.httpMetadata.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000'
      },
    });

    waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (err) {
    console.error(err);
    return new Response('Error fetching image', { status: 500 });
  }
}
