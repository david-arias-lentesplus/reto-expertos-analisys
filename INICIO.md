# ⚽ Desafío de Expertos – Mundial 2026

## ¿Por qué no funciona al abrir el archivo directamente?

Cuando haces doble clic en `index.html`, el navegador lo abre como `file://`.
Eso bloquea las peticiones a Google Sheets por seguridad (política CORS).
**Solución: abrir la app desde un servidor web local.** Son 3 pasos:

---

## 🚀 Opción 1 — Servidor local con Node.js (recomendada)

> Requiere tener Node.js instalado. Descárgalo en https://nodejs.org si no lo tienes.

1. Abre una **terminal** (Mac: `Terminal` | Windows: `Símbolo del sistema` o `PowerShell`)
2. Navega a esta carpeta:
   ```
   cd "/ruta/a/esta/carpeta"
   ```
3. Ejecuta:
   ```
   node server.js
   ```
4. Abre el navegador en **http://localhost:3000** ✅

---

## 🌐 Opción 2 — Despliegue gratuito en Netlify (recomendada para compartir)

Esta opción te da una URL pública que puedes compartir con todos los participantes.

1. Ve a **https://netlify.com/drop**
2. Arrastra esta carpeta completa al área de drop
3. Netlify te da una URL como `https://abc123.netlify.app` en menos de 1 minuto ✅

---

## 🐍 Opción 3 — Servidor con Python

Si tienes Python instalado (Mac/Linux ya lo traen):
```
cd "/ruta/a/esta/carpeta"
python3 -m http.server 3000
```
Luego abre **http://localhost:3000** ✅

---

## 📊 Configurar la hoja "Resultados" en Google Sheets

Para que el Ranking se actualice en tiempo real para todos los participantes:

1. Abre tu Google Sheet "Desafío de expertos"
2. Crea una **nueva hoja** llamada exactamente: `Resultados`
3. En esa hoja pon estas cabeceras en la fila 1:

   | A | B | C |
   |---|---|---|
   | partido_id | goles_local | goles_visitante |

4. Cada vez que haya un resultado, agrega una fila:

   | 1 | 2 | 1 |
   | 2 | 0 | 0 |

5. Publica esa hoja: **Archivo → Compartir → Publicar en la web → selecciona "Resultados" → CSV → Publicar**
6. Copia la URL que te da y pégala en `js/scoring.js` en la variable `RESULTADOS_CSV_URL`

---

## 📁 Estructura de archivos

```
📁 esta-carpeta/
├── index.html          → 📊 Dashboard de pronósticos
├── admin.html          → 🖊️ Panel de resultados reales (admin)
├── ranking.html        → 🏆 Tabla de posiciones
├── server.js           → 🖥️ Servidor local (ejecutar con Node.js)
└── js/
    ├── partidos-data.js  → 104 partidos del Mundial
    └── scoring.js        → Motor de cálculo de puntos
```
