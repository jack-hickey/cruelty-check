export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

	let data = await context.request.json(),
		browser = "Unknown",
		userAgent = navigator.userAgent,
		os = "Unknown",
		platform = navigator.platform.toLowerCase();

	if (userAgent.includes("Chrome") && !userAgent.includes("Edge") && !userAgent.includes("OPR")) { browser = "Chrome"; }
	else if (userAgent.includes("Firefox")) { browser = "Firefox"; }
	else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) { browser = "Safari"; }
	else if (userAgent.includes("Edge")) { browser = "Edge"; }
	else if (userAgent.includes("OPR") || userAgent.includes("Opera")) { browser = "Opera"; }

	if (platform.includes("win")) { os = "Windows"; }
	else if (platform.includes("mac")) { os = "macOS"; }
	else if (platform.includes("linux")) { os = "Linux"; }
	else if (/iphone|ipad|ipod/.test(userAgent.toLowerCase())) { os = "iOS"; }
	else if (/android/.test(userAgent.toLowerCase())) { os = "Android"; }

  if (!data.title || !data.description || !data.type) {
    return new Response("Bad Request", { status: 400 });
  }

	const issueBody = 
	`
		**Browser**
		${browser}

		**Operating System**
		${os}

		**Details**
		${data.description}
	`;

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
