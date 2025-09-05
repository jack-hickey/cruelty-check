export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

	const data = await context.request.json();

  if (!data.title || !data.description || !data.type) {
    return new Response("Bad Request", { status: 400 });
  }

  const issueBody = `**Type:** ${data.type}\n**Description:**\n${data.description}`;

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
