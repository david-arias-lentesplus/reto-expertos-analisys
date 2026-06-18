/**
 * Vercel Serverless Function: /api/clientes
 * Pagina automáticamente contra Metabase (500 filas/página via LIMIT+OFFSET)
 * hasta traer todos los registros disponibles.
 *
 * Caché stale-while-revalidate en /tmp (Vercel):
 *  · Si el archivo existe  →  responde INMEDIATAMENTE desde disco (ms)
 *  · Si tiene > FRESH_TTL  →  además lanza refresco en background
 *  · Si no existe          →  espera Metabase, guarda y responde
 *
 * OPTIMIZACIONES vs versión anterior:
 *  1. SQL: un solo scan de Silver.sales (clientes_cajas pre-agrega totales,
 *     eliminando las window functions de ordenes)
 *  2. Paginación paralela: CONCURRENCY páginas simultáneas por batch
 */

const https = require('https');
const fs    = require('fs');

const METABASE_MCP_URL = 'https://mcp.livocompany.com/metabase/mcp';
const METABASE_MCP_KEY = 'af7bd32eba834141058b8b453f07db8437dbd140bac1c92499e445e63912776b';
const METABASE_DB_ID   = 2;
const PAGE_SIZE        = 500;
const MAX_PAGES        = 40;
const CONCURRENCY      = 5;   // páginas paralelas por batch

// ── Caché en /tmp ─────────────────────────────────────────────────────────────
const CACHE_FILE = '/tmp/lentesplus_clientes.json';
const FRESH_TTL  = 15 * 60 * 1000;       // < 15 min → fresco
const MAX_AGE    = 24 * 60 * 60 * 1000;  // > 24 h   → ignorar

// Evita refrescos duplicados dentro de la misma instancia caliente
let isRefreshing = false;

function getCacheFile() {
  try {
    const stat = fs.statSync(CACHE_FILE);
    const age  = Date.now() - stat.mtimeMs;
    if (age > MAX_AGE) return null;
    const rows   = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const ageMin = Math.round(age / 60000);
    console.log(`[Cache] HIT clientes (${rows.length} filas, ${ageMin} min)`);
    return { rows, age, ageMin, stale: age > FRESH_TTL };
  } catch {
    return null;
  }
}

function setCacheFile(rows) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(rows));
    console.log(`[Cache] Guardado clientes.json (${rows.length} filas)`);
  } catch (e) {
    console.error('[Cache] Error escribiendo:', e.message);
  }
}

// ── SQL optimizado ────────────────────────────────────────────────────────────
// CAMBIO: clientes_cajas hace UN SOLO scan y pre-agrega totales por cliente.
// La versión anterior hacía dos scans a Silver.sales (clientes_ok + ordenes)
// y calculaba window functions (SUM/COUNT OVER PARTITION) fila por fila.
// Ahora ordenes lee los totales directamente del JOIN con clientes_cajas.
const CLIENTES_SQL_BASE = `
WITH clientes_cajas AS (
  -- Un solo scan: filtra clientes válidos Y pre-agrega sus totales
  SELECT
    customer_id,
    SUM(items_lenses_actual)::int AS total_cajas_cliente,
    COUNT(order_number)::int      AS total_ordenes_cliente
  FROM Silver.sales
  WHERE empresa = 'lentesplus'
    AND status IN ('complete', 'processing')
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
    TO_CHAR(TO_DATE(s.sale_date::text, 'YYYYMMDD'), 'YYYY-MM-DD')       AS fecha_recibido,
    TO_CHAR(s.confirmed_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS fecha_confirmado,
    s.items_lenses_actual::int  AS cajas_orden,
    c.total_cajas_cliente,
    c.total_ordenes_cliente
  FROM Silver.sales s
  INNER JOIN clientes_cajas c ON c.customer_id = s.customer_id
  WHERE s.empresa = 'lentesplus'
    AND s.status IN ('complete', 'processing')
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
    ) ORDER BY sp.type, sp.name)::text AS productos
  FROM Silver.sales_products sp
  INNER JOIN ordenes o ON o.order_number = sp.order_number
  LEFT JOIN Gold.catalog_products cp ON cp.sku = sp.sku
  WHERE sp.empresa = 'lentesplus'
    AND sp.status IN ('complete', 'processing')
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
  p.productos
FROM ordenes o
LEFT JOIN productos p ON p.order_number = o.order_number
ORDER BY o.total_cajas_cliente DESC, o.email, o.fecha_recibido`;

function buildPagedSQL(offset) {
  return CLIENTES_SQL_BASE + `\nLIMIT ${PAGE_SIZE} OFFSET ${offset}\n`;
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

// ── Paginación paralela ───────────────────────────────────────────────────────
// CAMBIO: en lugar de esperar page1→page2→page3 en serie,
// lanza CONCURRENCY páginas en paralelo y avanza hasta que
// alguna devuelva menos de PAGE_SIZE filas (= última página).
async function fetchAllRows() {
  const allRows = [];
  let offset    = 0;
  let done      = false;
  let batchNum  = 0;

  while (!done && offset < MAX_PAGES * PAGE_SIZE) {
    batchNum++;
    // Construir offsets del batch actual
    const batchOffsets = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const off = offset + i * PAGE_SIZE;
      if (off < MAX_PAGES * PAGE_SIZE) batchOffsets.push(off);
    }

    console.log(`[clientes] batch ${batchNum}: páginas offset ${batchOffsets[0]}–${batchOffsets[batchOffsets.length - 1]}`);

    // Lanzar todas en paralelo
    const results = await Promise.all(
      batchOffsets.map(off => callMetabaseMCP(buildPagedSQL(off)))
    );

    for (let i = 0; i < results.length; i++) {
      const { rows } = parseRows(results[i]);
      console.log(`[clientes] offset ${batchOffsets[i]}: ${rows.length} filas`);
      if (!rows.length) { done = true; break; }
      allRows.push(...rows);
      if (rows.length < PAGE_SIZE) { done = true; break; }
    }

    offset += CONCURRENCY * PAGE_SIZE;
  }

  console.log(`[clientes] total: ${allRows.length} filas`);
  return allRows;
}

function bgRefresh() {
  if (isRefreshing) { console.log('[BG] clientes ya está refrescando'); return; }
  isRefreshing = true;
  console.log('[BG] Iniciando refresco de clientes en background...');
  fetchAllRows()
    .then(rows  => setCacheFile(rows))
    .catch(err  => console.error('[BG] Error clientes:', err.message))
    .finally(   () => { isRefreshing = false; });
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const force = req.query && req.query.force === '1';

  // Servir desde /tmp si hay caché válido (excepto ?force=1)
  if (!force) {
    const cached = getCacheFile();
    if (cached) {
      res.status(200).json({
        rows:       cached.rows,
        rowCount:   cached.rows.length,
        fromCache:  true,
        stale:      cached.stale,
        ageMin:     cached.ageMin,
        refreshing: isRefreshing,
      });
      if (cached.stale) bgRefresh();
      return;
    }
  }

  // Sin caché o forzado: consultar Metabase
  try {
    const rows = await fetchAllRows();
    setCacheFile(rows);
    res.status(200).json({ rows, rowCount: rows.length, fromCache: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
