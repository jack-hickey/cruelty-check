// --- utils ---
function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "s-maxage=60", ...headers },
  });
}

function text(msg, status = 400, headers = {}) {
  return new Response(msg, { status, headers });
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
      (Name, Parent_ID, Cruelty_Free, B_Corp, Fair_Trade, Animal_Testing)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      body.Name,
      body.ParentID ?? null,
      body.CrueltyFree ? 1 : 0,
      body.BCorp ? 1 : 0,
      body.FairTrade ? 1 : 0,
      body.AnimalTesting ? 1 : 0
    )
    .run();

  return text("Ok", 200);
}

async function addProductHandler({ request, env }) {
  const body = await parseForm(request);
  const name = body.get("Name");
  const brandID = body.get("BrandID");
  const image = body.get("Image");
  if (!name || !brandID || !image) return text("Invalid body");

  const fileName = `${crypto.randomUUID()}.${image.name.split(".").pop()}`;
  await env.R2_BUCKET.put(fileName, image.stream(), {
    httpMetadata: { contentType: image.type || "application/octet-stream" },
  });

  await env.DATABASE
    .prepare("INSERT INTO Products (Name, Brand_ID, Is_Vegan, Image) VALUES (?, ?, ?, ?)")
    .bind(name, brandID, body.get("Vegan") === "true" ? 1 : 0, fileName)
    .run();

  return text("Ok", 200);
}

async function brandsHandler({ request, env }) {
  const body = await parseJSON(request);
  if (!body.query) return text("Missing query");

  const { results } = await env.DATABASE
    .prepare("SELECT * FROM Brands WHERE INSTR(LOWER(Name), ?) > 0 ORDER BY Name")
    .bind(body.query.toLowerCase())
    .all();

  return json(results);
}

async function searchHandler({ request, env }) {
  const body = await parseJSON(request);
  const term = body.query || "";
  const searchWords = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (searchWords.length === 0) return json([]);

  const scoreClauses = [];
  const whereClauses = [];
  const params = [];

  for (const word of searchWords) {
    scoreClauses.push("(INSTR(LOWER(p.Name), ?) > 0)");
    scoreClauses.push("(INSTR(LOWER(b.Name), ?) > 0)");
    whereClauses.push("(INSTR(LOWER(p.Name), ?) > 0 OR INSTR(LOWER(b.Name), ?) > 0)");
    params.push(word, word);
  }

  for (const word of searchWords) {
    params.push(word, word);
  }

  const sql = `
    SELECT 
      p.ID, p.Name, p.Image, p.Is_Vegan,
      b.Name AS Brand, b.Cruelty_Free, b.Animal_Testing,
      pb.Name AS Parent_Brand, pb.Cruelty_Free AS Parent_Cruelty_Free, pb.Animal_Testing AS Parent_Animal_Testing,
      (${scoreClauses.join(" + ")}) AS score
    FROM Products p
    LEFT JOIN Brands b ON b.ID = p.Brand_ID
    LEFT JOIN Brands pb ON pb.ID = b.Parent_ID
    WHERE ${whereClauses.join(" OR ")}
    AND p.Accepted = 1
    ORDER BY score DESC;
  `;

  const { results } = await env.DATABASE.prepare(sql).bind(...params).all();
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
