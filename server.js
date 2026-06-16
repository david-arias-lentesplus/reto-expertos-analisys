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

const PAGE_SIZE = 500;
const MAX_PAGES = 40; // tope de seguridad → 20 000 filas

// ── Caché en disco  ── stale-while-revalidate ─────────────────────────────────
// Estructura:  ./cache/clientes.json  y  ./cache/ventas.json
// Flujo:
//   1. Si el archivo existe  →  responde INMEDIATAMENTE (ms de disco)
//   2. Si tiene > FRESH_TTL  →  además lanza un refresh en background
//   3. Si no existe           →  espera Metabase, guarda y responde

const CACHE_DIR  = path.join(ROOT, 'cache');
const FRESH_TTL  = 15 * 60 * 1000;       // < 15 min → fresco, sin refresco extra
const MAX_AGE    = 24 * 60 * 60 * 1000;  // > 24 h   → ignora archivo (muy viejo)

// Evita lanzar el mismo refresco dos veces en paralelo
const refreshing = new Set();

// Crea el directorio de caché si no existe
try { if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

function getCacheFile(key) {
  const file = path.join(CACHE_DIR, key + '.json');
  try {
    const stat  = fs.statSync(file);
    const age   = Date.now() - stat.mtimeMs;
    if (age > MAX_AGE) return null;
    const rows  = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ageMin = Math.round(age / 60000);
    console.log(`[Cache] HIT "${key}" (${rows.length} filas, ${ageMin} min)`);
    return { rows, age, ageMin, stale: age > FRESH_TTL };
  } catch {
    return null;
  }
}

function setCacheFile(key, rows) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, key + '.json'), JSON.stringify(rows));
    console.log(`[Cache] Guardado ${key}.json (${rows.length} filas)`);
  } catch (e) {
    console.error('[Cache] Error escribiendo archivo:', e.message);
  }
}

function bgRefresh(key, baseSql) {
  if (refreshing.has(key)) { console.log(`[BG] "${key}" ya está refrescando`); return; }
  refreshing.add(key);
  console.log(`[BG] Iniciando refresco de "${key}" en background...`);
  fetchAllRows(baseSql, key)
    .then(rows  => setCacheFile(key, rows))
    .catch(err  => console.error(`[BG] Error en "${key}":`, err.message))
    .finally(   () => refreshing.delete(key));
}

const CLIENTES_SQL_BASE = `
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
ORDER BY o.total_cajas_cliente DESC, o.email, o.fecha_recibido`;

// ── SQL: TODOS los registros de ventas (sin filtro de 2+ cajas) ───────────────
const VENTAS_SQL_BASE = `
WITH ordenes AS (
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
ORDER BY o.total_cajas_cliente DESC, o.email, o.fecha_recibido`;

function buildPagedSQL(baseSql, offset) {
  return baseSql + `\nLIMIT ${PAGE_SIZE} OFFSET ${offset}\n`;
}

function callMetabaseMCP(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: { database_id: METABASE_DB_ID, query: sql, row_limit: PAGE_SIZE }
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
          const lines = raw.split('\n').filter(l => l.startsWith('data:'));
          const jsonStr = lines.length
            ? lines.map(l => l.replace(/^data:\s*/, '')).join('')
            : raw;
          resolve(JSON.parse(jsonStr));
        } catch (e) {
          reject(new Error('Parse error: ' + raw.slice(0, 300)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchAllRows(baseSql, label) {
  const allRows = [];
  let offset    = 0;
  let page      = 0;

  while (page < MAX_PAGES) {
    const sql       = buildPagedSQL(baseSql, offset);
    const mcpResult = await callMetabaseMCP(sql);
    const { rows }  = parseRows(mcpResult);

    console.log(`[${label}] página ${page + 1}: ${rows.length} filas (offset ${offset})`);
    if (!rows.length) break;
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break; // última página

    offset += PAGE_SIZE;
    page++;
  }

  console.log(`[${label}] total filas: ${allRows.length}`);
  return allRows;
}

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

function parseRows(mcpResult) {
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

function parseUrl(rawUrl) {
  try { return new URL(rawUrl, 'http://localhost'); } catch { return null; }
}

// ── Server ────────────────────────────────────────────────────────────────────
http.createServer((req, res) => {
  const parsed   = parseUrl(req.url);
  const pathname = parsed ? parsed.pathname : req.url.split('?')[0];
  const noCache  = parsed && parsed.searchParams.get('force') === '1';

  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Fábrica de handler API (stale-while-revalidate) ────────────────────────
  function handleApi(key, baseSql) {
    res.setHeader('Content-Type', 'application/json');

    // Servir desde disco inmediatamente (excepto si el usuario forzó recarga)
    if (!noCache) {
      const cached = getCacheFile(key);
      if (cached) {
        res.writeHead(200);
        res.end(JSON.stringify({
          rows:       cached.rows,
          rowCount:   cached.rows.length,
          fromCache:  true,
          stale:      cached.stale,
          ageMin:     cached.ageMin,
          refreshing: refreshing.has(key),
        }));
        // Si los datos están viejos, refrescar en fondo sin bloquear
        if (cached.stale) bgRefresh(key, baseSql);
        return;
      }
    }

    // Sin caché → primera vez o forzado: esperar Metabase
    console.log(`[API] Sin caché para "${key}", consultando Metabase...`);
    fetchAllRows(baseSql, key)
      .then(rows => {
        setCacheFile(key, rows);
        res.writeHead(200);
        res.end(JSON.stringify({ rows, rowCount: rows.length, fromCache: false }));
      })
      .catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
  }

  // ── API: clientes con 2+ cajas ──────────────────────────────────────────────
  if (pathname === '/api/clientes' && req.method === 'GET') {
    handleApi('clientes', CLIENTES_SQL_BASE);
    return;
  }

  // ── API: TODOS los registros de ventas ──────────────────────────────────────
  if (pathname === '/api/ventas' && req.method === 'GET') {
    handleApi('ventas', VENTAS_SQL_BASE);
    return;
  }

  // ── Archivos estáticos ──────────────────────────────────────────────────────
  let urlPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, urlPath);
  const ext      = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + urlPath);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
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
  console.log('  💡  Caché en disco (cache/) — primera carga guarda; siguientes son instantáneas');
  console.log('  💡  Usa ?force=1 para forzar refresco desde Metabase');
  console.log('');
  console.log('  Presiona Ctrl+C para detener el servidor.');
  console.log('');
});
