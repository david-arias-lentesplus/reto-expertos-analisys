/**
 * SCORING ENGINE – MUNDIAL 2026
 * Fuente única de verdad: Google Sheets (hoja "Resultados").
 * No se usa localStorage para resultados — todo viene del Sheet.
 */

// ── Fusionar participantes duplicados por correo exacto ───────────────────────
function mergeParticipantsByEmail(participants) {
  const byEmail = new Map();
  const noEmail = [];

  for (const p of participants) {
    const key = p.correo;
    if (!key) {
      noEmail.push({ ...p, pronosticos: { ...p.pronosticos } });
      continue;
    }
    if (byEmail.has(key)) {
      const existing = byEmail.get(key);
      // Fusionar pronósticos: el registro más reciente gana en conflicto
      existing.pronosticos = { ...existing.pronosticos, ...p.pronosticos };
      // Actualizar nombre si el registro anterior estaba vacío
      if (!existing.nombres && p.nombres) existing.nombres = p.nombres;
      if (!existing.apellidos && p.apellidos) existing.apellidos = p.apellidos;
      if (!(existing.nombreCompleto || '').trim() && (p.nombreCompleto || '').trim()) {
        existing.nombreCompleto = p.nombreCompleto;
      }
    } else {
      byEmail.set(key, { ...p, pronosticos: { ...p.pronosticos } });
    }
  }

  return [...byEmail.values(), ...noEmail];
}

// ── Parsear CSV de pronósticos ────────────────────────────────────────────────
async function fetchPronosticos() {
  let text;
  try {
    // Cache-bust para que siempre traiga datos frescos
    const url = CSV_URL + '&_t=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    text = await res.text();
  } catch (e) {
    throw new Error('No se pudo leer el CSV de pronósticos. ' + (e.message || e));
  }
  return parseCSVText(text);
}

function parseCSVText(text) {
  const result = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows   = result.data;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];

  const partidoColMap = {};
  headers.forEach((h, i) => {
    if (h && /^partido-\d+[ab]$/.test(h.trim())) {
      partidoColMap[h.trim()] = i;
    }
  });

  const idx  = (name) => headers.findIndex(h => h && h.trim() === name);
  const iNom = idx('Nombres');
  const iApe = idx('Apellidos');
  const iCor = idx('Correo electrónico');

  // Valores que se consideran "sin pronóstico" aunque aparezcan en el CSV
  // (celdas vacías, guiones, N/A, etc.)
  const SIN_DATO = /^[-–—]+$|^n\.?a\.?$|^$/i;

  const parsed = rows.slice(1).map((row, n) => {
    const pronosticos = {};
    Object.entries(partidoColMap).forEach(([col, ci]) => {
      const v = row[ci];
      if (v === undefined || v === null) return;
      const raw = v.toString().trim();

      // Ignorar vacíos, guiones y similares antes de intentar parseInt
      if (SIN_DATO.test(raw)) return;

      const num = parseInt(raw, 10);
      // Solo valores enteros no-negativos son válidos como goles
      if (!isNaN(num) && num >= 0) pronosticos[col] = num;
    });
    return {
      id:            row[0] || ('p-' + n),
      nombres:       iNom >= 0 ? (row[iNom]  || '') : '',
      apellidos:     iApe >= 0 ? (row[iApe]  || '') : '',
      correo:        iCor >= 0 ? (row[iCor]  || '') : '',
      nombreCompleto: [
        (iNom >= 0 ? row[iNom]  : '') || '',
        (iApe >= 0 ? row[iApe]  : '') || ''
      ].join(' ').trim(),
      pronosticos,
    };
  }).filter(p => p.nombres || p.correo);

  return mergeParticipantsByEmail(parsed);
}

// ── Cargar resultados desde Google Sheets (ÚNICA fuente) ──────────────────────
// Hoja "Resultados" con columnas: partido_id | goles_local | goles_visitante
async function fetchResultadosSheets() {
  if (!RESULTADOS_CSV_URL) {
    console.warn('[Resultados] RESULTADOS_CSV_URL no configurada en partidos-data.js');
    return {};
  }
  try {
    // _t= fuerza recarga sin caché en navegador y en CDN de Google
    const url = RESULTADOS_CSV_URL + '&_t=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[Resultados] HTTP error:', res.status);
      return {};
    }
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      console.warn('[Resultados] Hoja vacía');
      return {};
    }

    const { data: rows } = Papa.parse(text, { header: false, skipEmptyLines: true });
    if (!rows || rows.length < 2) return {};

    const headers = rows[0].map(h => (h || '').trim().toLowerCase());
    const dataRows = rows.slice(1);

    const findCol = (...names) => {
      for (const n of names) {
        const i = headers.findIndex(h => h === n || h.replace(/\s+/g, '_') === n);
        if (i >= 0) return i;
      }
      return -1;
    };

    let iId  = findCol('partido_id', 'partido', 'id', '#', 'num');
    let iLoc = findCol('goles_local', 'local', 'loc', 'home', 'a');
    let iVis = findCol('goles_visitante', 'visitante', 'vis', 'away', 'b');

    if (iId  < 0) iId  = 0;
    if (iLoc < 0) iLoc = 1;
    if (iVis < 0) iVis = 2;

    // Fecha de hoy en formato YYYY-MM-DD (UTC) para comparar con partido.fecha
    const hoy = new Date().toISOString().slice(0, 10);

    // Construir mapa rápido de fechas por partido_id desde PARTIDOS global
    const fechaPartido = {};
    if (typeof PARTIDOS !== 'undefined') {
      PARTIDOS.forEach(p => { fechaPartido[p.id] = p.fecha; });
    }

    const resultados = {};
    dataRows.forEach(row => {
      const id  = parseInt(row[iId],  10);
      const loc = parseInt(row[iLoc], 10);
      const vis = parseInt(row[iVis], 10);

      if (isNaN(id) || isNaN(loc) || isNaN(vis) || id <= 0) return;

      // ── GUARDIA: solo aceptar resultado si el partido ya se jugó ──────────
      // Si no tenemos la fecha del partido (no hay PARTIDOS global), aceptamos.
      const fechaP = fechaPartido[id];
      if (fechaP && fechaP > hoy) {
        console.warn(`[Resultados] Partido ${id} (${fechaP}) ignorado — aún no se juega`);
        return;
      }

      resultados[id] = { local: loc, visitante: vis };
    });

    const count = Object.keys(resultados).length;
    console.log('[Resultados] ' + count + ' marcadores cargados desde Google Sheets');
    return resultados;
  } catch(e) {
    console.error('[Resultados] Error:', e);
    return {};
  }
}

// ── Calcular puntos de UN participante ───────────────────────────────────────
function calcularPuntosParticipante(pronosticos, resultados) {
  let total = 0;
  const detalle = [];

  // Fecha de hoy en YYYY-MM-DD para comparar con partido.fecha
  const hoy = new Date().toISOString().slice(0, 10);

  PARTIDOS.forEach(partido => {
    const keyA      = 'partido-' + partido.id + 'a';
    const keyB      = 'partido-' + partido.id + 'b';
    const resultado = resultados[partido.id];

    // ── Pronóstico: ambos lados deben estar presentes (no null) ──────────────
    const pronLocal     = pronosticos[keyA] != null ? pronosticos[keyA] : null;
    const pronVisitante = pronosticos[keyB] != null ? pronosticos[keyB] : null;
    const realLocal     = resultado ? resultado.local     : null;
    const realVisitante = resultado ? resultado.visitante : null;

    // ── GUARDIA DE FECHA: el partido debe haber ocurrido ya ──────────────────
    // Esto evita sumar puntos por:
    //   · Partidos futuros con resultados pre-cargados en la hoja
    //   · Partidos sin resultado real marcados accidentalmente como 0-0
    const partidoJugado = partido.fecha <= hoy;

    let ptos = 0;
    if (
      partidoJugado &&
      pronLocal !== null && pronVisitante !== null &&
      realLocal !== null && realVisitante !== null &&
      pronLocal === realLocal && pronVisitante === realVisitante
    ) {
      ptos = partido.puntos;
    }

    total += ptos;
    detalle.push({
      partidoId:    partido.id,
      local:        partido.local,
      visitante:    partido.visitante,
      fecha:        partido.fecha,
      fase:         partido.fase,
      faseNombre:   partido.faseNombre,
      pronLocal,
      pronVisitante,
      realLocal,
      realVisitante,
      puntos:       ptos,
      jugado:       partidoJugado && realLocal !== null && realVisitante !== null,
      pronosticado: pronLocal !== null && pronVisitante !== null,
    });
  });

  return { total, detalle };
}

// ── Calcular ranking completo ─────────────────────────────────────────────────
function calcularRanking(participants, resultados) {
  const ranking = participants.map(p => {
    const { total, detalle } = calcularPuntosParticipante(p.pronosticos, resultados);
    const aciertos      = detalle.filter(d => d.puntos > 0).length;
    const pronosticados = detalle.filter(d => d.pronosticado).length;

    const porFase = {};
    detalle.forEach(d => {
      if (!porFase[d.fase]) porFase[d.fase] = { puntos: 0, aciertos: 0, faseNombre: d.faseNombre };
      porFase[d.fase].puntos   += d.puntos;
      porFase[d.fase].aciertos += d.puntos > 0 ? 1 : 0;
    });

    return { ...p, puntosTotales: total, aciertos, pronosticados, porFase, detalle };
  });

  ranking.sort((a, b) =>
    b.puntosTotales !== a.puntosTotales
      ? b.puntosTotales - a.puntosTotales
      : b.aciertos - a.aciertos
  );

  let pos = 1;
  ranking.forEach((r, i) => {
    if (i > 0 &&
        r.puntosTotales === ranking[i-1].puntosTotales &&
        r.aciertos      === ranking[i-1].aciertos) {
      r.posicion = ranking[i-1].posicion;
    } else {
      r.posicion = pos;
    }
    pos++;
  });

  return ranking;
}

// ── Stats generales ───────────────────────────────────────────────────────────
function getStats(resultados) {
  const jugados    = PARTIDOS.filter(p => resultados[p.id] !== undefined).length;
  const pendientes = PARTIDOS.length - jugados;
  return { total: PARTIDOS.length, jugados, pendientes };
}

function getPronTanda(pronosticos, tanda) {
  return tanda.partidos.map(p => ({
    partido:   p,
    local:     pronosticos['partido-' + p.id + 'a'] != null ? pronosticos['partido-' + p.id + 'a'] : null,
    visitante: pronosticos['partido-' + p.id + 'b'] != null ? pronosticos['partido-' + p.id + 'b'] : null,
  }));
}
