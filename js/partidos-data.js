/**
 * PARTIDOS – MUNDIAL 2026
 * Array plano con los 104 partidos numerados secuencialmente.
 *
 * Sistema de puntos (puntos.md):
 *   Fases 1–6  → grupos (Jun 11–26)       → 1 pto por marcador exacto
 *   Fase 7     → Jun 27–Jul 3             → 2 ptos (últimos grupos + 16avos)
 *   Fase 8     → octavos (Jul 4–7)        → 3 ptos
 *   Fase 9     → cuartos (Jul 9–11)       → 4 ptos
 *   Fase Final → semis + final (Jul 14–19)→ 5 ptos
 */

const FASES = {
   1: { nombre: 'Tanda 1 – Grupos',        puntos: 1, partidos: '1–12'    },
   2: { nombre: 'Tanda 2 – Grupos',        puntos: 1, partidos: '13–24'   },
   3: { nombre: 'Tanda 3 – Grupos',        puntos: 1, partidos: '25–36'   },
   4: { nombre: 'Tanda 4 – Grupos',        puntos: 1, partidos: '37–48'   },
   5: { nombre: 'Tanda 5 – Grupos',        puntos: 1, partidos: '49–60'   },
   6: { nombre: 'Tanda 6 – Grupos',        puntos: 1, partidos: '61–72'   },
   7: { nombre: 'Dieciseisavos de Final',  puntos: 2, partidos: '73–84'   },
   8: { nombre: 'Octavos de Final',        puntos: 3, partidos: '85–96'   },
   9: { nombre: 'Cuartos de Final',        puntos: 4, partidos: '97–102'  },
  10: { nombre: 'Semis / Final',           puntos: 5, partidos: '103–104' },
};

const PARTIDOS = [
  // ── FASE 1 (Jun 11) ────────────────────────────────────────────
  { id:  1, fecha:'2026-06-11', dia:'Jueves',    local:'México',               visitante:'Sudáfrica',            fase:1 },
  { id:  2, fecha:'2026-06-11', dia:'Jueves',    local:'República de Corea',   visitante:'Chequia',              fase:1 },
  // ── FASE 2 (Jun 12–14) ─────────────────────────────────────────
  { id:  3, fecha:'2026-06-12', dia:'Viernes',   local:'Canadá',               visitante:'Bosnia y Herzegovina', fase:1 },
  { id:  4, fecha:'2026-06-12', dia:'Viernes',   local:'EE. UU.',              visitante:'Paraguay',             fase:1 },
  { id:  5, fecha:'2026-06-13', dia:'Sábado',    local:'Catar',                visitante:'Suiza',                fase:1 },
  { id:  6, fecha:'2026-06-13', dia:'Sábado',    local:'Brasil',               visitante:'Marruecos',            fase:1 },
  { id:  7, fecha:'2026-06-13', dia:'Sábado',    local:'Haití',                visitante:'Escocia',              fase:1 },
  { id:  8, fecha:'2026-06-13', dia:'Sábado',    local:'Australia',            visitante:'Turquía',              fase:1 },
  { id:  9, fecha:'2026-06-14', dia:'Domingo',   local:'Alemania',             visitante:'Curazao',              fase:1 },
  { id: 10, fecha:'2026-06-14', dia:'Domingo',   local:'Países Bajos',         visitante:'Japón',                fase:1 },
  { id: 11, fecha:'2026-06-14', dia:'Domingo',   local:'Costa de Marfil',      visitante:'Ecuador',              fase:1 },
  { id: 12, fecha:'2026-06-14', dia:'Domingo',   local:'Suecia',               visitante:'Túnez',                fase:1 },
  // ── FASE 3 (Jun 15–17) ─────────────────────────────────────────
  { id: 13, fecha:'2026-06-15', dia:'Lunes',     local:'España',               visitante:'Islas de Cabo Verde',  fase:2 },
  { id: 14, fecha:'2026-06-15', dia:'Lunes',     local:'Bélgica',              visitante:'Egipto',               fase:2 },
  { id: 15, fecha:'2026-06-15', dia:'Lunes',     local:'Arabia Saudí',         visitante:'Uruguay',              fase:2 },
  { id: 16, fecha:'2026-06-15', dia:'Lunes',     local:'RI de Irán',           visitante:'Nueva Zelanda',        fase:2 },
  { id: 17, fecha:'2026-06-16', dia:'Martes',    local:'Francia',              visitante:'Senegal',              fase:2 },
  { id: 18, fecha:'2026-06-16', dia:'Martes',    local:'Irak',                 visitante:'Noruega',              fase:2 },
  { id: 19, fecha:'2026-06-16', dia:'Martes',    local:'Argentina',            visitante:'Argelia',              fase:2 },
  { id: 20, fecha:'2026-06-16', dia:'Martes',    local:'Austria',              visitante:'Jordania',             fase:2 },
  { id: 21, fecha:'2026-06-17', dia:'Miércoles', local:'Portugal',             visitante:'RD Congo',             fase:2 },
  { id: 22, fecha:'2026-06-17', dia:'Miércoles', local:'Inglaterra',           visitante:'Croacia',              fase:2 },
  { id: 23, fecha:'2026-06-17', dia:'Miércoles', local:'Ghana',                visitante:'Panamá',               fase:2 },
  { id: 24, fecha:'2026-06-17', dia:'Miércoles', local:'Uzbekistán',           visitante:'Colombia',             fase:2 },
  // ── FASE 4 (Jun 18–20) ─────────────────────────────────────────
  { id: 25, fecha:'2026-06-18', dia:'Jueves',    local:'Chequia',              visitante:'Sudáfrica',            fase:3 },
  { id: 26, fecha:'2026-06-18', dia:'Jueves',    local:'Suiza',                visitante:'Bosnia y Herzegovina', fase:3 },
  { id: 27, fecha:'2026-06-18', dia:'Jueves',    local:'Canadá',               visitante:'Catar',                fase:3 },
  { id: 28, fecha:'2026-06-18', dia:'Jueves',    local:'México',               visitante:'República de Corea',   fase:3 },
  { id: 29, fecha:'2026-06-19', dia:'Viernes',   local:'EE. UU.',              visitante:'Australia',            fase:3 },
  { id: 30, fecha:'2026-06-19', dia:'Viernes',   local:'Escocia',              visitante:'Marruecos',            fase:3 },
  { id: 31, fecha:'2026-06-19', dia:'Viernes',   local:'Brasil',               visitante:'Haití',                fase:3 },
  { id: 32, fecha:'2026-06-19', dia:'Viernes',   local:'Turquía',              visitante:'Paraguay',             fase:3 },
  { id: 33, fecha:'2026-06-20', dia:'Sábado',    local:'Países Bajos',         visitante:'Suecia',               fase:3 },
  { id: 34, fecha:'2026-06-20', dia:'Sábado',    local:'Alemania',             visitante:'Costa de Marfil',      fase:3 },
  { id: 35, fecha:'2026-06-20', dia:'Sábado',    local:'Ecuador',              visitante:'Curazao',              fase:3 },
  { id: 36, fecha:'2026-06-20', dia:'Sábado',    local:'Túnez',                visitante:'Japón',                fase:3 },
  // ── FASE 5 (Jun 21–23) ─────────────────────────────────────────
  { id: 37, fecha:'2026-06-21', dia:'Domingo',   local:'España',               visitante:'Arabia Saudí',         fase:4 },
  { id: 38, fecha:'2026-06-21', dia:'Domingo',   local:'Bélgica',              visitante:'RI de Irán',           fase:4 },
  { id: 39, fecha:'2026-06-21', dia:'Domingo',   local:'Uruguay',              visitante:'Islas de Cabo Verde',  fase:4 },
  { id: 40, fecha:'2026-06-21', dia:'Domingo',   local:'Nueva Zelanda',        visitante:'Egipto',               fase:4 },
  { id: 41, fecha:'2026-06-22', dia:'Lunes',     local:'Argentina',            visitante:'Austria',              fase:4 },
  { id: 42, fecha:'2026-06-22', dia:'Lunes',     local:'Francia',              visitante:'Irak',                 fase:4 },
  { id: 43, fecha:'2026-06-22', dia:'Lunes',     local:'Noruega',              visitante:'Senegal',              fase:4 },
  { id: 44, fecha:'2026-06-22', dia:'Lunes',     local:'Jordania',             visitante:'Argelia',              fase:4 },
  { id: 45, fecha:'2026-06-23', dia:'Martes',    local:'Portugal',             visitante:'Uzbekistán',           fase:4 },
  { id: 46, fecha:'2026-06-23', dia:'Martes',    local:'Inglaterra',           visitante:'Ghana',                fase:4 },
  { id: 47, fecha:'2026-06-23', dia:'Martes',    local:'Panamá',               visitante:'Croacia',              fase:4 },
  { id: 48, fecha:'2026-06-23', dia:'Martes',    local:'Colombia',             visitante:'RD Congo',             fase:4 },
  // ── FASE 6 (Jun 24–26) ─────────────────────────────────────────
  { id: 49, fecha:'2026-06-24', dia:'Miércoles', local:'Suiza',                visitante:'Canadá',               fase:5 },
  { id: 50, fecha:'2026-06-24', dia:'Miércoles', local:'Bosnia y Herzegovina', visitante:'Catar',                fase:5 },
  { id: 51, fecha:'2026-06-24', dia:'Miércoles', local:'Escocia',              visitante:'Brasil',               fase:5 },
  { id: 52, fecha:'2026-06-24', dia:'Miércoles', local:'Marruecos',            visitante:'Haití',                fase:5 },
  { id: 53, fecha:'2026-06-24', dia:'Miércoles', local:'Chequia',              visitante:'México',               fase:5 },
  { id: 54, fecha:'2026-06-24', dia:'Miércoles', local:'Sudáfrica',            visitante:'República de Corea',   fase:5 },
  { id: 55, fecha:'2026-06-25', dia:'Jueves',    local:'Curazao',              visitante:'Costa de Marfil',      fase:5 },
  { id: 56, fecha:'2026-06-25', dia:'Jueves',    local:'Ecuador',              visitante:'Alemania',             fase:5 },
  { id: 57, fecha:'2026-06-25', dia:'Jueves',    local:'Japón',                visitante:'Suecia',               fase:5 },
  { id: 58, fecha:'2026-06-25', dia:'Jueves',    local:'Túnez',                visitante:'Países Bajos',         fase:5 },
  { id: 59, fecha:'2026-06-25', dia:'Jueves',    local:'Turquía',              visitante:'EE. UU.',              fase:5 },
  { id: 60, fecha:'2026-06-25', dia:'Jueves',    local:'Paraguay',             visitante:'Australia',            fase:5 },
  { id: 61, fecha:'2026-06-26', dia:'Viernes',   local:'Noruega',              visitante:'Francia',              fase:6 },
  { id: 62, fecha:'2026-06-26', dia:'Viernes',   local:'Senegal',              visitante:'Irak',                 fase:6 },
  { id: 63, fecha:'2026-06-26', dia:'Viernes',   local:'Islas de Cabo Verde',  visitante:'Arabia Saudí',         fase:6 },
  { id: 64, fecha:'2026-06-26', dia:'Viernes',   local:'Uruguay',              visitante:'España',               fase:6 },
  { id: 65, fecha:'2026-06-26', dia:'Viernes',   local:'Egipto',               visitante:'RI de Irán',           fase:6 },
  { id: 66, fecha:'2026-06-26', dia:'Viernes',   local:'Nueva Zelanda',        visitante:'Bélgica',              fase:6 },
  // ── FASE 7 (Jun 27–Jul 3) – 2 ptos ────────────────────────────
  { id: 67, fecha:'2026-06-27', dia:'Sábado',    local:'Panamá',               visitante:'Inglaterra',           fase:6 },
  { id: 68, fecha:'2026-06-27', dia:'Sábado',    local:'Croacia',              visitante:'Ghana',                fase:6 },
  { id: 69, fecha:'2026-06-27', dia:'Sábado',    local:'Colombia',             visitante:'Portugal',             fase:6 },
  { id: 70, fecha:'2026-06-27', dia:'Sábado',    local:'RD Congo',             visitante:'Uzbekistán',           fase:6 },
  { id: 71, fecha:'2026-06-27', dia:'Sábado',    local:'Argelia',              visitante:'Austria',              fase:6 },
  { id: 72, fecha:'2026-06-27', dia:'Sábado',    local:'Jordania',             visitante:'Argentina',            fase:6 },
  { id: 73, fecha:'2026-06-28', dia:'Domingo',   local:'2A',                   visitante:'2B',                   fase:7 },
  { id: 74, fecha:'2026-06-29', dia:'Lunes',     local:'1C',                   visitante:'2F',                   fase:7 },
  { id: 75, fecha:'2026-06-29', dia:'Lunes',     local:'1E',                   visitante:'3ABCDF',               fase:7 },
  { id: 76, fecha:'2026-06-29', dia:'Lunes',     local:'1F',                   visitante:'2C',                   fase:7 },
  { id: 77, fecha:'2026-06-30', dia:'Martes',    local:'2E',                   visitante:'2I',                   fase:7 },
  { id: 78, fecha:'2026-06-30', dia:'Martes',    local:'1I',                   visitante:'3CDFGH',               fase:7 },
  { id: 79, fecha:'2026-06-30', dia:'Martes',    local:'1A',                   visitante:'3CEFHI',               fase:7 },
  { id: 80, fecha:'2026-07-01', dia:'Miércoles', local:'1L',                   visitante:'3EHIJK',               fase:7 },
  { id: 81, fecha:'2026-07-01', dia:'Miércoles', local:'1G',                   visitante:'3AEHIJ',               fase:7 },
  { id: 82, fecha:'2026-07-01', dia:'Miércoles', local:'1D',                   visitante:'3BEFIJ',               fase:7 },
  { id: 83, fecha:'2026-07-02', dia:'Jueves',    local:'1H',                   visitante:'2J',                   fase:7 },
  { id: 84, fecha:'2026-07-02', dia:'Jueves',    local:'2K',                   visitante:'2L',                   fase:7 },
  { id: 85, fecha:'2026-07-02', dia:'Jueves',    local:'1B',                   visitante:'3EFGIJ',               fase:8 },
  { id: 86, fecha:'2026-07-03', dia:'Viernes',   local:'2D',                   visitante:'2G',                   fase:8 },
  { id: 87, fecha:'2026-07-03', dia:'Viernes',   local:'1J',                   visitante:'2H',                   fase:8 },
  { id: 88, fecha:'2026-07-03', dia:'Viernes',   local:'1K',                   visitante:'3DEIJL',               fase:8 },
  // ── FASE 8 – OCTAVOS (Jul 4–7) – 3 ptos ───────────────────────
  { id: 89, fecha:'2026-07-04', dia:'Sábado',    local:'W73',  visitante:'W75',   fase:8 },
  { id: 90, fecha:'2026-07-04', dia:'Sábado',    local:'W74',  visitante:'W77',   fase:8 },
  { id: 91, fecha:'2026-07-05', dia:'Domingo',   local:'W76',  visitante:'W78',   fase:8 },
  { id: 92, fecha:'2026-07-05', dia:'Domingo',   local:'W79',  visitante:'W80',   fase:8 },
  { id: 93, fecha:'2026-07-06', dia:'Lunes',     local:'W83',  visitante:'W84',   fase:8 },
  { id: 94, fecha:'2026-07-06', dia:'Lunes',     local:'W81',  visitante:'W82',   fase:8 },
  { id: 95, fecha:'2026-07-07', dia:'Martes',    local:'W86',  visitante:'W88',   fase:8 },
  { id: 96, fecha:'2026-07-07', dia:'Martes',    local:'W85',  visitante:'W87',   fase:8 },
  // ── FASE 9 – CUARTOS (Jul 9–11) – 4 ptos ──────────────────────
  { id:  97, fecha:'2026-07-09', dia:'Jueves',    local:'W89',   visitante:'W90',   fase:9 },
  { id:  98, fecha:'2026-07-10', dia:'Viernes',   local:'W93',   visitante:'W94',   fase:9 },
  { id:  99, fecha:'2026-07-11', dia:'Sábado',    local:'W91',   visitante:'W92',   fase:9 },
  { id: 100, fecha:'2026-07-11', dia:'Sábado',    local:'W95',   visitante:'W96',   fase:9 },
  // ── FASE FINAL (Jul 14–19) – 5 ptos ───────────────────────────
  { id: 101, fecha:'2026-07-14', dia:'Martes',    local:'W97',   visitante:'W98',   fase:9 },
  { id: 102, fecha:'2026-07-15', dia:'Miércoles', local:'W99',   visitante:'W100',  fase:9 },
  { id: 103, fecha:'2026-07-18', dia:'Sábado',    local:'RU101', visitante:'RU102', fase:10 },
  { id: 104, fecha:'2026-07-19', dia:'Domingo',   local:'W101',  visitante:'W102',  fase:10 },
];

// Enriquecer con datos de fase
PARTIDOS.forEach(p => {
  p.puntos    = FASES[p.fase].puntos;
  p.faseNombre = FASES[p.fase].nombre;
});

// Tandas agrupadas por fase (T1-T8: 12 partidos, T9: 6 partidos, T10: 2 partidos)
const TANDAS = Object.keys(FASES).map(Number).map(faseNum => ({
  numero:   faseNum,
  partidos: PARTIDOS.filter(p => p.fase === faseNum)
}));

// URL pública CSV pronósticos
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRUGHvPhaSHy76E60C-XS8y34ch4Fcru0mxhwA3QJe79zOh3PlzVqQiOorgUZ1kv-lwn2CA5-XWX9IA/pub?gid=1388420467&single=true&output=csv';
const RESULTADOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRUGHvPhaSHy76E60C-XS8y34ch4Fcru0mxhwA3QJe79zOh3PlzVqQiOorgUZ1kv-lwn2CA5-XWX9IA/pub?gid=1528059350&single=true&output=csv';

// Clave localStorage para resultados reales
const LS_KEY = 'mundial2026_resultados';

// ── Funciones utilitarias ─────────────────────────────────────────────────────

function getPartidoById(id) {
  return PARTIDOS.find(p => p.id === id) || null;
}

function getPartidosByFecha(fecha) {
  return PARTIDOS.filter(p => p.fecha === fecha);
}

function getFechasUnicas() {
  return [...new Set(PARTIDOS.map(p => p.fecha))].sort();
}

function getTandaDePartido(id) {
  return TANDAS.findIndex(t => t.partidos.some(p => p.id === id)) + 1;
}
