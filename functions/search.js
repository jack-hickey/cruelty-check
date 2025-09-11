export async function onRequestPost(context) {
  const { request, env } = context;

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const term = body.query || "",
  	searchWords = term.trim().toLowerCase().split(/\s+/);

  const scoreClauses = [],
		whereClauses = [],
  	params = [];

  searchWords.forEach(word => {
    scoreClauses.push("(INSTR(LOWER(p.Name), ?) > 0)");
    scoreClauses.push("(INSTR(LOWER(b.Name), ?) > 0)");
    whereClauses.push("(INSTR(LOWER(p.Name), ?) > 0 OR INSTR(LOWER(b.Name), ?) > 0)");

    params.push(word, word);
  });

  searchWords.forEach(word => {
    params.push(word, word);
  });

  const sql = `
    SELECT p.*, b.Name AS Brand, b.Cruelty_Free,
      (${scoreClauses.join(" + ")}) AS score
    FROM Products p
    LEFT JOIN Brands b ON b.ID = p.Brand_ID
    WHERE ${whereClauses.join(" OR ")}
    ORDER BY score DESC
  `;

  const { results } = await env.DATABASE.prepare(sql).bind(...params).all();

  return Response.json(results);
}
