// Bump CACHE on every deployed change, or phones keep serving the old version.
const CACHE = "khlui-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => fetch(u, { cache: "reload" }).then(r => c.put(u, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Fonts: cache-first so the Thai typefaces work offline.
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
    })));
    return;
  }
  // Song search and anything else cross-origin goes straight to the network.
  if (url.origin !== location.origin) return;
  // App shell: network-first with a short timeout, then cache.
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(e.request, { ignoreSearch: true })
      .then(r => r || caches.match("index.html")).then(r => { if (!done) { done = true; resolve(r); } });
    const t = setTimeout(fallback, 2500);
    fetch(e.request).then(r => {
      clearTimeout(t);
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      if (!done) { done = true; resolve(r); }
    }).catch(() => { clearTimeout(t); fallback(); });
  }));
});
