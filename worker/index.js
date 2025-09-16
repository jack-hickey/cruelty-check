var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// products/[filename].js
async function onRequest(context) {
  const { env, params } = context;
  const filename = params.filename;
  if (!filename) return new Response("File not specified", { status: 400 });
  const object = await env.R2_BUCKET.get(filename);
  if (!object) return new Response("File not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000"
    }
  });
}

__name(onRequest, "onRequest");

async function onRequestProductCount(context) {
	const { env } = context;

	const { results } = await env.DATABASE
		.prepare("SELECT COUNT(*) AS Count FROM Products WHERE Accepted=0")
		.all();

	const count = results[0].Count;

  const badgeData = {
    schemaVersion: 1,
    label: "pending products",
    message: count.toString(),
    color: count > 0 ? "orange" : "brightgreen",
  };

  return new Response(JSON.stringify(badgeData), {
    headers: { "Content-Type": "application/json" },
  });
}

__name(onRequestProductCount, "onRequest");

// addbrand.js
async function onRequestAddBrand(context) {
  const { request, env } = context;

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
	}

	if (!body.Name) { return new Response("Invalid JSON", { status: 400 }); }
	
	const params = [
  	body.Name ?? "",
  	body.ParentID ?? null,
  	body.CrueltyFree ? 1 : 0,
  	body.BCorp ? 1 : 0,
  	body.FairTrade ? 1 : 0,
  	body.AnimalTesting ? 1 : 0,
	];

	await env.DATABASE
  	.prepare("INSERT OR IGNORE INTO Brands (Name, Parent_ID, Cruelty_Free, B_Corp, Fair_Trade, Animal_Testing) VALUES (?, ?, ?, ?, ?, ?)")
  	.bind(...params)
  	.run();

	return new Response("Ok", { status: 200 });
}

__name(onRequestAddBrand, "onRequestPost");

// addproduct.js
async function onRequestAddProduct(context) {
  const { request, env } = context;

  let body;

  try {
    body = await request.formData();
  } catch {
    return new Response("Invalid body", { status: 400 });
	}

	const name = body.get("Name"),
		brandID = body.get("BrandID"),
		image = body.get("Image");

	if (!name || !brandID || !image) { return new Response("Invalid body", { status: 400 }); }

	const fileExtension = image.name.split(".").pop(),
		fileName = `${crypto.randomUUID()}.${fileExtension}`;

	await env.R2_BUCKET.put(fileName, image.stream(), {
		httpMetadata: {
			contentType: image.type || "application/octet-stream"
		}
	});

	await env.DATABASE
		.prepare("INSERT INTO Products (Name, Brand_ID, Is_Vegan, Image) VALUES (?, ?, ?, ?)")
		.bind(name, brandID, body.get("Vegan") === "true" ? 1 : 0, fileName)
		.run();

	return new Response("Ok", { status: 200 });
}

__name(onRequestAddProduct, "onRequestPost");

// brands.js
async function onRequestBrands(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

	const { results }= await env.DATABASE.prepare("SELECT * FROM Brands WHERE INSTR(LOWER(Name), ?) > 0 ORDER BY Name")
		.bind(body.query.toLowerCase()).all();

	return Response.json(results);
}

__name(onRequestBrands, "onRequestPost");

// search.js
async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const term = body.query || "", searchWords = term.trim().toLowerCase().split(/\s+/);
  const scoreClauses = [], whereClauses = [], params = [];
  searchWords.forEach((word) => {
    scoreClauses.push("(INSTR(LOWER(p.Name), ?) > 0)");
    scoreClauses.push("(INSTR(LOWER(b.Name), ?) > 0)");
    whereClauses.push("(INSTR(LOWER(p.Name), ?) > 0 OR INSTR(LOWER(b.Name), ?) > 0)");
    params.push(word, word);
  });
  searchWords.forEach((word) => {
    params.push(word, word);
  });
  const sql = `
		SELECT 
   		p.ID,
    	p.Name,
			p.Image,
			p.Is_Vegan,
    	b.Name AS Brand,
    	b.Cruelty_Free,
			b.Animal_Testing,
			pb.Name As Parent_Brand,
    	pb.Cruelty_Free AS Parent_Cruelty_Free,
			pb.Animal_Testing AS Parent_Animal_Testing,
    	(${scoreClauses.join(" + ")}) AS score
		FROM Products p
		LEFT JOIN Brands b ON b.ID = p.Brand_ID
		LEFT JOIN Brands pb ON pb.ID = b.Parent_ID
		WHERE ${whereClauses.join(" OR ")}
		AND p.Accepted = 1
		ORDER BY score DESC;
  `;
  const { results } = await env.DATABASE.prepare(sql).bind(...params).all();
  return Response.json(results);
}
__name(onRequestPost, "onRequestPost");

// report.js
async function onRequest2(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const browserMap = [
    { name: "Edge", regex: /edg/ },
    { name: "Opera", regex: /(opera|opr)/ },
    { name: "Vivaldi", regex: /vivaldi/ },
    { name: "Brave", regex: /brave/ },
    { name: "Chrome", regex: /chrome/, exclude: /(edg|opr|vivaldi|brave)/ },
    { name: "Firefox", regex: /firefox/ },
    { name: "Safari", regex: /safari/, exclude: /chrome|chromium|crios/ },
    { name: "Samsung Internet", regex: /samsungbrowser/ },
    { name: "Internet Explorer", regex: /msie|trident/ }
  ];
  let data = await context.request.json(), os = "Unknown", userAgent = context.request.headers.get("user-agent").toLowerCase(), browser = browserMap.find((x) => x.regex.test(userAgent) && (!x.exclude || !x.exclude.test(userAgent)))?.name ?? "Unknown";
  if (/Windows NT 10\.0/i.test(userAgent)) {
    os = "Windows 10/11";
  } else if (/Windows NT 6\.3/i.test(userAgent)) {
    os = "Windows 8.1";
  } else if (/Windows NT 6\.2/i.test(userAgent)) {
    os = "Windows 8";
  } else if (/Windows NT 6\.1/i.test(userAgent)) {
    os = "Windows 7";
  } else if (/Windows Phone|IEMobile/i.test(userAgent)) {
    os = "Windows Phone";
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    os = "macOS";
  } else if (/CrOS/i.test(userAgent)) {
    os = "ChromeOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  } else if (/Android/i.test(userAgent)) {
    os = "Android";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = "iOS";
  }
  if (!data.title || !data.description || !data.type) {
    return new Response("Bad Request", { status: 400 });
  }
  const issueBody = `### Details
${data.description}
### Source
Browser: ${browser}
Operating System: ${os}`;
  const response = await fetch(`https://api.github.com/repos/${context.env.GITHUB_REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `token ${context.env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "cloudflare-pages-form"
    },
    body: JSON.stringify({
      title: data.title,
      body: issueBody,
      labels: [data.type.toLowerCase()],
      assignee: "jack-hickey"
    })
  });
  return response.ok ? new Response("", { status: 200 }) : new Response(await response.text(), { status: response.status });
}
__name(onRequest2, "onRequest");

// ../../../../.wrangler/tmp/pages-PaDRjU/functionsRoutes-0.6069523131100558.mjs
var routes = [
  {
    routePath: "/products/:filename",
    mountPath: "/products",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
	{
		routePath: "/productcount",
		mountPath: "/",
		method: "",
		middlewares: [],
		modules: [onRequestProductCount]
	},
	{
		routePath: "/addbrand",
		mountPath: "/",
		method: "POST",
		middlewares: [],
		modules: [onRequestAddBrand]
	},
	{
		routePath: "/addproduct",
		mountPath: "/",
		method: "POST",
		middlewares: [],
		modules: [onRequestAddProduct]
	},
  {
    routePath: "/search",
    mountPath: "/",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
	{
		routePath: "/brands",
		mountPath: "/",
		method: "POST",
		middlewares: [],
		modules: [onRequestBrands]
	},
  {
    routePath: "/report",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  }
];

// ../../../../AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
