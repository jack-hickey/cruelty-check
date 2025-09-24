// --- utils ---
function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "s-maxage=60", ...headers },
  });
}

function getNormalizedText(text) {
	if (!text) return "";

  return text
		.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

function text(message, status = 400, headers = {}) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain", ...headers },
  });
}

async function parseJSON(request) {
  try {
    return await request.json();
  } catch {
    throw text("Invalid JSON", 400);
  }
}

async function parseForm(request) {
  try {
    return await request.formData();
  } catch {
    throw text("Invalid body", 400);
  }
}

// --- handlers ---
async function productsHandler({ env, params }) {
  if (!params.filename) return text("File not specified");

  const object = await env.R2_BUCKET.get(params.filename);
  if (!object) return text("File not found", 404);

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}

async function productCountHandler({ env }) {
  const { results } = await env.DATABASE
    .prepare("SELECT COUNT(*) AS Count FROM Products WHERE Accepted=0")
    .all();

  const count = results[0].Count;

  return json({
    schemaVersion: 1,
    label: "pending products",
    message: count.toString(),
    color: count > 0 ? "orange" : "brightgreen",
  });
}

async function addBrandHandler({ request, env }) {
  const body = await parseJSON(request);
  if (!body.Name) return text("Invalid JSON");

  await env.DATABASE
    .prepare(`
      INSERT OR IGNORE INTO Brands 
      (Name, Parent_ID, Cruelty_Free, B_Corp, Animal_Testing, Search_Name)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      body.Name,
      body.ParentID ?? null,
      body.CrueltyFree ? 1 : 0,
      body.BCorp ? 1 : 0,
      body.AnimalTesting ? 1 : 0,
			getNormalizedText(body.Name)
    )
    .run();

  return text("Ok", 200);
}

async function addProductHandler({ request, env }) {
  const body = await parseForm(request);
  const name = body.get("Name");
  const brandID = body.get("BrandID");
  let image = body.get("Image");

  if (!name || !brandID || !image || !image.type.startsWith("image/")) return text("Invalid body", 400);

  const fileName = `${crypto.randomUUID()}.${image.name.split(".").pop()}`;

  await env.R2_BUCKET.put(fileName, image.stream());

  await env.DATABASE
    .prepare("INSERT INTO Products (Name, Brand_ID, Is_Vegan, Image, Search_Name) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(name, brandID, body.get("Vegan") === "true" ? 1 : 0, fileName, getNormalizedText(name))
    .run();

  return text("Ok", 200);
}

async function brandsHandler({ request, env }) {
  const body = await parseJSON(request);
  if (!body.query) return text("Missing query");

  const query = getNormalizedText(body.query) + "*";

  const { results } = await env.DATABASE
    .prepare(`
      SELECT b.*, bm25(BrandsFTS) AS score
      FROM BrandsFTS
      JOIN Brands b ON b.ID = BrandsFTS.rowid
      WHERE BrandsFTS MATCH ?
      ORDER BY score ASC
      LIMIT 50
    `)
    .bind(query)
    .all();

  return json(results);
}

async function searchHandler({ request, env }) {
  const body = await parseJSON(request);
  const query = (body.query || "").trim();
  if (!query) return json([]);

  const searchWords = query
    .split(/\s+/)
    .map(getNormalizedText)
    .filter(Boolean);

  if (searchWords.length === 0) return json([]);

  const ftsQuery = searchWords.map(word => `${word}*`).join(' AND ');

  const sql = `
		WITH RECURSIVE BrandHierarchy AS (
				SELECT 
						b.ID, b.Name, b.Parent_ID, b.Cruelty_Free, b.Animal_Testing, b.B_Corp,
						0 AS Level, p.ID AS Product_ID
				FROM Products p
				JOIN Brands b ON b.ID = p.Brand_ID

				UNION ALL

				SELECT 
						pb.ID, pb.Name, pb.Parent_ID, pb.Cruelty_Free, pb.Animal_Testing, pb.B_Corp,
						bh.Level + 1, bh.Product_ID
				FROM Brands pb
				JOIN BrandHierarchy bh ON bh.Parent_ID = pb.ID
		),
		RankedProducts AS (
				SELECT 
						Products.rowid AS Product_ID,
						bm25(ProductsFTS) AS score
				FROM ProductsFTS
				JOIN Products ON Products.ID = ProductsFTS.rowid
				WHERE ProductsFTS MATCH ?
		)
		SELECT 
				p.Name, p.Image, p.Is_Vegan,
				(
						SELECT json_group_array(
								json_object(
										'ID', ID,
										'Name', Name,
										'B_Corp', B_Corp,
										'Cruelty_Free', Cruelty_Free,
										'Animal_Testing', Animal_Testing,
										'Parent_ID', Parent_ID,
										'Level', Level
								)
						)
						FROM BrandHierarchy bh
						WHERE bh.Product_ID = p.ID
						ORDER BY Level
				) AS Brand_Hierarchy
		FROM RankedProducts rp
		JOIN Products p ON p.ID = rp.Product_ID
		WHERE p.Accepted = 1
		ORDER BY rp.score ASC;
  `;

  const { results } = await env.DATABASE.prepare(sql).bind(ftsQuery).all();
  return json(results);
}

async function reportHandler({ request, env }) {
  if (request.method !== "POST") return text("Method Not Allowed", 405);

  const data = await parseJSON(request);
  if (!data.title || !data.description || !data.type) return text("Bad Request", 400);

  const ua = request.headers.get("user-agent")?.toLowerCase() || "";
  const browserMap = [
    { name: "Edge", regex: /edg/ },
    { name: "Opera", regex: /(opera|opr)/ },
    { name: "Vivaldi", regex: /vivaldi/ },
    { name: "Brave", regex: /brave/ },
    { name: "Chrome", regex: /chrome/, exclude: /(edg|opr|vivaldi|brave)/ },
    { name: "Firefox", regex: /firefox/ },
    { name: "Safari", regex: /safari/, exclude: /chrome|chromium|crios/ },
    { name: "Samsung Internet", regex: /samsungbrowser/ },
    { name: "Internet Explorer", regex: /msie|trident/ },
  ];
  const browser = browserMap.find(x => x.regex.test(ua) && (!x.exclude || !x.exclude.test(ua)))?.name ?? "Unknown";

  const os =
    /Windows NT 10\.0/.test(ua) ? "Windows 10/11" :
    /Windows NT 6\.3/.test(ua) ? "Windows 8.1" :
    /Windows NT 6\.2/.test(ua) ? "Windows 8" :
    /Windows NT 6\.1/.test(ua) ? "Windows 7" :
    /Windows Phone|IEMobile/.test(ua) ? "Windows Phone" :
    /Macintosh|Mac OS X/.test(ua) ? "macOS" :
    /CrOS/.test(ua) ? "ChromeOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" :
    "Unknown";

  const issueBody = `### Details
${data.description}
### Source
Browser: ${browser}
Operating System: ${os}`;

  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `token ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "cloudflare-pages-form",
    },
    body: JSON.stringify({
      title: data.title,
      body: issueBody,
      labels: [data.type.toLowerCase()],
      assignee: "jack-hickey",
    }),
  });

  return response.ok
    ? text("Ok", 200)
    : text(await response.text(), response.status);
}

// --- router ---
const routes = [
  { method: "GET", path: /^\/products\/([^/]+)$/, handler: productsHandler, paramNames: ["filename"] },
  { method: "GET", path: /^\/productcount$/, handler: productCountHandler },
  { method: "POST", path: /^\/addbrand$/, handler: addBrandHandler },
  { method: "POST", path: /^\/addproduct$/, handler: addProductHandler },
  { method: "POST", path: /^\/brands$/, handler: brandsHandler },
  { method: "POST", path: /^\/search$/, handler: searchHandler },
  { method: "POST", path: /^\/report$/, handler: reportHandler },
];

// --- entrypoint ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    for (const route of routes) {
      if (route.method && route.method !== request.method) continue;
      const match = url.pathname.match(route.path);
      if (match) {
        const params = {};
        if (route.paramNames) {
          route.paramNames.forEach((name, i) => params[name] = match[i + 1]);
        }
        return route.handler({ request, env, ctx, params });
      }
    }

    return text("Not found", 404);
  },
};
