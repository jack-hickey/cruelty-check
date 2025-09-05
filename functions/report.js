export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

	let data = await context.request.json(),
		browser = "Unknown",
		os = "Unknown",
		userAgent = context.request.headers.get("user-agent").toLowerCase();

	if (userAgent.includes("chrome") && !userAgent.includes("edge") && !userAgent.includes("opr")) { browser = "Chrome"; }
	else if (userAgent.includes("firefox")) { browser = "Firefox"; }
	else if (userAgent.includes("safari") && !userAgent.includes("chrome")) { browser = "Safari"; }
	else if (userAgent.includes("edge")) { browser = "Edge"; }
	else if (userAgent.includes("opr") || userAgent.includes("opera")) { browser = "Opera"; }

	if (/Windows NT 10\.0/i.test(userAgent)) { os = "Windows 10/11"; }
	else if (/Windows NT 6\.3/i.test(userAgent)) { os = "Windows 8.1"; }
	else if (/Windows NT 6\.2/i.test(userAgent)) { os = "Windows 8"; }
	else if (/Windows NT 6\.1/i.test(userAgent)) { os = "Windows 7"; }
	else if (/Windows Phone|IEMobile/i.test(userAgent)) { os = "Windows Phone"; }
	else if (/Macintosh|Mac OS X/i.test(userAgent)) { os = "macOS"; }
	else if (/CrOS/i.test(userAgent)) { os = "ChromeOS"; }
	else if (/Linux/i.test(userAgent)) { os = "Linux"; }
	else if (/Android/i.test(userAgent)) { os = "Android"; }
	else if (/iPhone|iPad|iPod/i.test(userAgent)) { os = "iOS"; }

  if (!data.title || !data.description || !data.type) {
    return new Response("Bad Request", { status: 400 });
  }

	const issueBody = `### Browser\n${browser}\n### Operating System\n${os}\n### Details\n${data.description}`;

  const response = await fetch(`https://api.github.com/repos/${context.env.GITHUB_REPO}/issues`, {
    method: 'POST',
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

	return response.ok
		? new Response("", { status: 200 })
		: new Response(await response.text(), { status: response.status });
}
