export async function onRequestPost(context) {
  const { request, env } = context;

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const term = body.term || "";

	const { results } = await env.DATABASE.prepare(
    "SELECT * FROM Products WHERE Name LIKE ?"
  ).bind(`%${term}%`).all();

  return Response.json(results);
}
