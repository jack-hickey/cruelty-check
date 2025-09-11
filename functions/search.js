export async function onRequestPost(context) {
  const { request, env } = context;

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const term = body.query || "";

	const { results } = await env.DATABASE.prepare(
		`
	 		SELECT p.*, b.Name AS Brand, b.Cruelty_Free FROM Products p
			LEFT JOIN Brands b ON b.ID = p.Brand_ID
			WHERE p.Name LIKE ?
		`
  ).bind(`%${term}%`).all();

  return Response.json(results);
}
