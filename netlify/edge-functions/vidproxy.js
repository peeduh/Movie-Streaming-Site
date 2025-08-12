// netlify/edge-functions/vidproxy.js
export default async (request, context) => {
  const { pathname } = new URL(request.url);
  // Expect /vidproxy/tt1234567 or /p/tt1234567 depending on your route
  const parts = pathname.split("/");
  const imdb = parts[2]; // e.g., "tt30445556"
  if (!imdb || !/^tt\d{7,9}$/i.test(imdb)) {
    return new Response("Usage: /vidproxy/tt0118884", { status: 400 });
  }

  const upstream = `https://vidsrc.net/embed/${imdb}`;

  // 1) Fetch upstream HTML with a Referer that vidsrc recognizes
  const res = await fetch(upstream, {
    headers: {
      "Referer": "https://vidsrc.net/",
      "User-Agent": request.headers.get("user-agent") || "",
      "Accept-Language": request.headers.get("accept-language") || "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) {
    // If they ever return non-HTML, just pass it through
    return new Response(res.body, {
      status: res.status,
      headers: { "content-type": ct || "text/plain" },
    });
  }

  // 2) Read HTML and inject <base> so relative URLs resolve to vidsrc.net
  let html = await res.text();

  // Add <base href="https://vidsrc.net/"> right after <head>
  if (html.match(/<head[^>]*>/i)) {
    html = html.replace(
      /<head[^>]*>/i,
      (m) => `${m}\n<base href="https://vidsrc.net/">`
    );
  } else {
    // Fallback: prepend a head with base (very rare)
    html = `<!DOCTYPE html><head><base href="https://vidsrc.net/"></head>${html}`;
  }

  // Optional: ensure no-referrer isn't set by upstream
  // (we'll prefer sending origin/referrer when they load subresources)
  // You can leave this out; it's mostly harmless.
  html = html.replace(
    /<meta[^>]+name=["']referrer["'][^>]*>/gi,
    '<meta name="referrer" content="origin">'
  );

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "origin",
    },
  });
};

export const config = {
  // Make sure this matches your netlify.toml route.
  // If your route is [[edge_functions]] path="/vidproxy/*"
  path: "/vidproxy/:imdb",
};
