/**
 * Servidor local simple para la app del Mundial 2026.
 * Requiere Node.js (ya instalado en la mayoría de computadores).
 *
 * CÓMO USARLO:
 *   1. Abre una terminal en esta carpeta
 *   2. Ejecuta:  node server.js
 *   3. Abre el navegador en:  http://localhost:3000
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT = 3000;
const ROOT = __dirname;

// ── Metabase MCP ──────────────────────────────────────────────────────────────
const METABASE_MCP_URL = 'https://mcp.livocompany.com/metabase/mcp';
const METABASE_MCP_KEY = 'af7bd32eba834141058b8b453f07db8437dbd140bac1c92499e445e63912776b';
const METABASE_DB_ID   = 2;

const CLIENTES_SQL = `
WITH clientes_ok AS (
  SELECT customer_id
  FROM Silver.sales
  WHERE empresa = 'lentesplus'
    AND (status = 'complete' OR status = 'processing')
    AND has_lenses = true
    AND confirmed_at BETWEEN '2026-06-01' AND '2026-07-20'
  GROUP BY customer_id
  HAVING SUM(items_lenses_actual) >= 2
),
ordenes AS (
  SELECT
    s.customer_id,
    s.email,
    s.country,
    s.order_number,
    TO_CHAR(TO_DATE(s.sale_date::text, 'YYYYMMDD'), 'YYYY-MM-DD')          AS fecha_recibido,
    TO_CHAR(s.confirmed_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')    AS fecha_confirmado,
    s.items_lenses_actual::int AS cajas_orden,
    SUM(s.items_lenses_actual) OVER (PARTITION BY s.customer_id)::int AS total_cajas_cliente,
    COUNT(s.order_number)      OVER (PARTITION BY s.customer_id)::int AS total_ordenes_cliente
  FROM Silver.sales s
  INNER JOIN clientes_ok c ON c.customer_id = s.customer_id
  WHERE s.empresa = 'lentesplus'
    AND (s.status = 'complete' OR s.status = 'processing')
    AND s.has_lenses = true
    AND s.confirmed_at BETWEEN '2026-06-01' AND '2026-07-20'
),
productos AS (
  SELECT
    sp.order_number,
    STRING_AGG(DISTINCT cp.manufacturer, ', ' ORDER BY cp.manufacturer)
      FILTER (WHERE cp.manufacturer IS NOT NULL AND sp.type ILIKE '%lente%') AS fabricantes,
    json_agg(json_build_object(
      'nombre',     sp.name,
      'marca',      sp.brand,
      'fabricante', cp.manufacturer,
      'cantidad',   sp.quantity_actual,
      'tipo',       sp.type
    ) ORDER BY sp.type, sp.name) AS productos
  FROM Silver.sales_products sp
  LEFT JOIN Gold.catalog_products cp ON cp.sku = sp.sku
  INNER JOIN ordenes o ON o.order_number = sp.order_number
  WHERE sp.empresa = 'lentesplus'
    AND (sp.status = 'complete' OR sp.status = 'processing')
  GROUP BY sp.order_number
)
SELECT
  o.customer_id,
  o.email,
  o.country,
  o.order_number,
  o.fecha_recibido,
  o.fecha_confirmado,
  o.cajas_orden,
  o.total_cajas_cliente,
  o.total_ordenes_cliente,
  p.fabricantes,
  p.productos::text AS productos
FROM ordenes o
LEFT JOIN productos p ON p.order_number = o.order_number
ORDER BY o.total_cajas_cliente DESC, o.email, o.fecha_recibido
`;

function callMetabaseMCP(sql, callback) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'execute',
      arguments: { database_id: METABASE_DB_ID, query: sql, row_limit: 500 }
    }
  });

  const urlObj  = new URL(METABASE_MCP_URL);
  const options = {
    hostname: urlObj.hostname,
    path:     urlObj.pathname + '?api_key=' + METABASE_MCP_KEY,
    method:   'POST',
    headers: {
      'Content-Type':   'application/json',
      'Accept':         'application/json, text/event-stream',

      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req = https.request(options, res => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        // MCP puede responder con SSE "data: ..." o JSON plano
        const lines = raw.split('\n').filter(l => l.startsWith('data:'));
        const jsonStr = lines.length
          ? lines.map(l => l.replace(/^data:\s*/, '')).join('')
          : raw;
        callback(null, JSON.parse(jsonStr));
      } catch (e) {
        callback(new Error('Parse error: ' + raw.slice(0, 300)));
      }
    });
  });

  req.on('error', callback);
  req.write(body);
  req.end();
}

// Extrae filas del resultado MCP → [{email, customer_id, total_cajas, total_ordenes}, ...]
function parseRows(mcpResult) {
  console.log('[Metabase] raw keys:', JSON.stringify(Object.keys(mcpResult)));
  console.log('[Metabase] full response:', JSON.stringify(mcpResult).slice(0, 800));

  // Busca recursivamente el objeto {data, row_count} en cualquier nivel / string anidado
  function findDataDeep(obj, depth) {
    if (!obj || depth > 7) return null;
    if (typeof obj === 'string') {
      try { return findDataDeep(JSON.parse(obj), depth + 1); } catch { return null; }
    }
    if (typeof obj !== 'object') return null;
    if (obj.data !== undefined && obj.row_count !== undefined) return obj;
    for (const v of Object.values(obj)) {
      const found = findDataDeep(v, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const inner = findDataDeep(mcpResult, 0);
  if (!inner) throw new Error('No se encontró {data, row_count} en la respuesta MCP');

  const data = inner.data || {};
  const rows = [];
  const len  = Object.keys(data).length;
  for (let i = 0; i < len; i++) rows.push(data[i]);
  return { rows, rowCount: inner.row_count || len };
}

// ── MIME ──────────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// ── Server ────────────────────────────────────────────────────────────────────
http.createServer((req, res) => {

  // ── API: clientes con 2+ cajas ────────────────────────────────────────────
  if (req.url === '/api/clientes' && req.method === 'GET') {
    callMetabaseMCP(CLIENTES_SQL, (err, mcpResult) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      try {
        const { rows, rowCount } = parseRows(mcpResult);
        res.writeHead(200);
        res.end(JSON.stringify({ rows, rowCount }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message, raw: JSON.stringify(mcpResult).slice(0, 500) }));
      }
    });
    return;
  }

  // ── Archivos estáticos ────────────────────────────────────────────────────
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  urlPath = urlPath.split('?')[0];
  const filePath = path.join(ROOT, urlPath);
  const ext      = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log('');
  console.log('  ⚽  Desafío de Expertos – Mundial 2026');
  console.log('  ─────────────────────────────────────');
  console.log(`  🟢  Servidor corriendo en http://localhost:${PORT}`);
  console.log('');
  console.log('  📊  Dashboard  →  http://localhost:' + PORT + '/index.html');
  console.log('  🖊️   Admin      →  http://localhost:' + PORT + '/admin.html');
  console.log('  🏆  Ranking    →  http://localhost:' + PORT + '/ranking.html');
  console.log('  👥  Clientes   →  http://localhost:' + PORT + '/clientes.html');
  console.log('');
  console.log('  Presiona Ctrl+C para detener el servidor.');
  console.log('');
});
