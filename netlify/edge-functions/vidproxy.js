// netlify/edge-functions/vidproxy.js
// Proxies https://vidsrc.net/embed/:imdb and SANITIZES the HTML:
// - adds <base href="https://vidsrc.net/">
// - strips ad/popup/analytics scripts
// - removes document.write() injection
// - (optional) sandboxes the inner #player_iframe
// - guards window.open in parent

export default async (request, context) => {
  const url = new URL(request.url);
  // Expect /vidproxy/tt1234567  (ensure your netlify.toml path matches)
  const imdb = url.pathname.split("/")[2];
  if (!imdb || !/^tt\d{7,9}$/i.test(imdb)) {
    return new Response("Usage: /vidproxy/tt0118884", { status: 400 });
    }

  const upstream = `https://vidsrc.net/embed/${imdb}`;

  const res = await fetch(upstream, {
    headers: {
      // give them a familiar referrer & UA
      "Referer": "https://vidsrc.net/",
      "User-Agent": request.headers.get("user-agent") || "",
      "Accept-Language": request.headers.get("accept-language") || "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) {
    return new Response(res.body, { status: res.status, headers: { "content-type": ct || "text/plain" } });
  }

  let html = await res.text();

  // 1) Ensure relative URLs point to vidsrc.net
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<base href="https://vidsrc.net/">`);
  } else {
    html = `<!DOCTYPE html><head><base href="https://vidsrc.net/"></head>${html}`;
  }

  // 2) Strip known popup/analytics/anti-devtools scripts by src
  html = html
    // cloudnestra (ad loader + player iframe opener)
    .replace(/<script[^>]+src="[^"]*cloudnestra[^"]*"[^>]*><\/script>/gi, "")
    // histats counter
    .replace(/<script[^>]+src="[^"]*histats[^"]*"[^>]*><\/script>/gi, "")
    // disable-devtool
    .replace(/<script[^>]+src="[^"]*disable-devtool[^"]*"[^>]*><\/script>/gi, "")
    // local asdf.js & sbx.js variants
    .replace(/<script[^>]+src="\/asdf\.js"[^>]*><\/script>/gi, "")
    .replace(/<script[^>]+src="\/sbx\.js[^"]*"[^>]*><\/script>/gi, "");

  // 3) Remove dynamic document.write injection of obfuscated local script (/fxxxx.js?...).
  html = html.replace(/<script>\s*document\.write\([^<]+<\/script>/gi, "");

  // 4) (Optional) remove some known ad containers (defensive; won't break if not present)
  html = html
    .replace(/<div[^>]+id="AdWidgetContainer"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]+id="ad720"[^>]*>[\s\S]*?<\/div>/gi, "");

  // 5) Kill target="_blank" so links can’t force new tabs from this parent page
  html = html.replace(/target="_blank"/gi, "");

  // 6) Add sandbox to the inner player iframe (blocks popups from that frame)
  //    If playback breaks, you can comment this block out and redeploy.
  html = html.replace(
    /<iframe([^>]*\bid=['"]player_iframe['"][^>]*)>/i,
    (m, attrs) =>
      `<iframe${attrs} sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" referrerpolicy="origin">`
  );

  // 7) Guard script to neuter window.open() in the PARENT page (best-effort)
  const guard = `
    <script>
      (function(){
        try {
          Object.defineProperty(window, 'open', { configurable:true, writable:true, value: function(){ return null; } });
        } catch(_) { window.open = function(){ return null; }; }

        const _add = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, handler, opts){
          if (type === 'click' && typeof handler === 'function') {
            const wrapped = function(ev){
              const _o = window.open;
              window.open = function(){ return null; };
              try { return handler.call(this, ev); }
              finally { window.open = _o; }
            };
            return _add.call(this, type, wrapped, opts);
          }
          return _add.call(this, type, handler, opts);
        };
      })();
    </script>
  `;
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, guard + "</head>");
  } else {
    html = guard + html;
  }

  // 8) CSP on the parent page: allow https resources, block top-level navigations
  const csp = [
    "default-src 'self' https: data: blob:",
    "script-src 'unsafe-inline' 'unsafe-eval' https: blob: data:",
    "style-src 'unsafe-inline' https:",
    "img-src https: data: blob:",
    "media-src https: blob: data:",
    "connect-src https: wss: blob:",
    "child-src https: blob: data:",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "navigate-to 'self'"
  ].join("; ");

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": csp,
      "x-frame-options": "SAMEORIGIN",
      "referrer-policy": "origin",
      "permissions-policy": "interest-cohort=(), autoplay=*, fullscreen=*"
    }
  });
};

export const config = {
  // Must match your netlify.toml route
  path: "/vidproxy/:imdb",
};
