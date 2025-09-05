export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

	const data = await context.request.json();

  if (!data.title || !data.description || !data.type) {
    return new Response("All fields are required", { status: 400 });
  }

  const issueBody = `**Type:** ${data.type}\n**Description:**\n${data.description}`;

  // Call GitHub API
  const response = await fetch(`https://api.github.com/repos/${context.env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${context.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
			"User-Agent": "cloudflare-pages-form"
    },
    body: JSON.stringify({
      title:data.title,
      body: issueBody
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    return new Response(`GitHub API error`, { status: response.status });
  }

  return new Response("Your issue has been submitted to GitHub!", { status: 200 });
}
