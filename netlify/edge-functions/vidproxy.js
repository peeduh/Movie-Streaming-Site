export default async (request, context) => {
  const { pathname } = new URL(request.url);

  // Extract ID from /vidproxy/{id}
  const id = pathname.split("/")[2];
  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  // Target URL on vidsrc.net
  const targetUrl = `https://vidsrc.net/embed/${id}`;

  // Fetch from vidsrc.net with custom headers
  const res = await fetch(targetUrl, {
    headers: {
      "Referer": "https://vidsrc.net/", // pretending request comes from vidsrc.net
      "User-Agent": request.headers.get("user-agent"),
    },
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
};

export const config = {
  path: "/vidproxy/:id", // route pattern
};
