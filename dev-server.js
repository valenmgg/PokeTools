/* ============================================================
   dev-server.js — servidor local SIN dependencias (Node 14+)
   Sirve los archivos estáticos y, para cualquier ruta sin archivo
   (ej. /pokemon/pikachu), devuelve index.html: igual que vercel.json.
   Uso:  node dev-server.js        (puerto 3000; otro: PORT=5000 node dev-server.js)
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }

  let file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }   // evita salir de la carpeta

  fs.stat(file, (err, stat) => {
    if (!err && stat.isFile()) return send(res, file);
    if (path.extname(pathname)) { res.writeHead(404); return res.end('Not found'); } // archivo con extensión inexistente
    send(res, path.join(ROOT, 'index.html'));                                        // ruta de la app -> index.html
  });
});

function send(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); return res.end('Error'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

server.listen(PORT, () => console.log(`PokéTools en http://localhost:${PORT}`));
