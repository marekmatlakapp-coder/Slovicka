// Jednoduchý lokálny server pre D:\Slovicka. Použitie: node server.cjs [port]
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.normalize('D:/Slovicka'), port = +process.argv[2] || 8777;
const typ = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.webmanifest':'application/manifest+json', '.png':'image/png' };
http.createServer((q, r) => {
  let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(root, f);
  if (!p.startsWith(root)) { r.writeHead(403); return r.end(); }
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typ[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
}).listen(port, () => console.log('beží na http://localhost:' + port));
