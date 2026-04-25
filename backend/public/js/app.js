/* global L, Chart, io */

const MAX_POINTS = 400;
const DATA_SILENCE_MS = 4500;

const chartLabels = [];
const series = {
  spd: [], v: [], i: [], w: [], bat: [], tmp: [],
};

const historyForAvg = {
  spd: [], v: [], i: [], w: [], bat: [], tmp: [],
};
const MAX_AVG = 600;

/** @type {L.Map|null} */
let map = null;
/** @type {L.Marker|null} */
let arrowMarker = null;
let lastLat = null;
let lastLon = null;
let lastBearingDeg = 0;

/** @type {ReturnType<typeof io>|null} */
let socketRef = null;
let lastTelemetryAt = 0;

/** @type {Map<string, { wrap: HTMLElement, chart: Chart }>} */
const metricChartPanels = new Map();

let recording = false;
/** @type {object[]} */
let csvBuffer = [];

const els = {
  lastDataLine: document.getElementById('lastDataLine'),
  connGlyph: document.getElementById('connGlyph'),
  connGlyphSvg: document.getElementById('connGlyphSvg'),
  connText: document.getElementById('connText'),
  errBanner: document.getElementById('errBanner'),
  coordPill: document.getElementById('coordPill'),
  btnRecord: document.getElementById('btnRecord'),
  btnStopDownload: document.getElementById('btnStopDownload'),
  recStatus: document.getElementById('recStatus'),
  metricGrid: document.getElementById('metricGrid'),
  multiChartHost: document.getElementById('multiChartHost'),
  imuGx: document.getElementById('imuGx'),
  imuGy: document.getElementById('imuGy'),
  imuGz: document.getElementById('imuGz'),
  imuAx: document.getElementById('imuAx'),
  imuAy: document.getElementById('imuAy'),
  imuAz: document.getElementById('imuAz'),
  imuMx: document.getElementById('imuMx'),
  imuMy: document.getElementById('imuMy'),
  imuMz: document.getElementById('imuMz'),
};

const METRICS = [
  {
    key: 'spd',
    label: 'Speed',
    unit: 'km/h',
    accent: 'bg-sky-50 text-sky-600 border-sky-100',
    detailTitle: 'Speed',
    detailSub: 'Vehicle speed over time',
    yMax: 200,
  },
  {
    key: 'v',
    label: 'Fuel Cell Voltage',
    unit: 'V',
    accent: 'bg-amber-50 text-amber-600 border-amber-100',
    detailTitle: 'Fuel Cell Voltage',
    detailSub: 'Stack voltage (V)',
    yMax: 60,
  },
  {
    key: 'i',
    label: 'Fuel Cell Current',
    unit: 'A',
    accent: 'bg-orange-50 text-orange-600 border-orange-100',
    detailTitle: 'Fuel Cell Current',
    detailSub: 'Stack current (A)',
    yMax: 30,
  },
  {
    key: 'w',
    label: 'Total Power',
    unit: 'W',
    accent: 'bg-violet-50 text-violet-600 border-violet-100',
    detailTitle: 'Total Power',
    detailSub: 'Electrical power (W)',
    yMax: 1000,
  },
  {
    key: 'bat',
    label: 'Remaining Energy',
    unit: '%',
    accent: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    detailTitle: 'Remaining Energy',
    detailSub: 'Battery / energy gauge (%)',
    yMax: 100,
  },
  {
    key: 'tmp',
    label: 'System Temperature',
    unit: '°C',
    accent: 'bg-rose-50 text-rose-600 border-rose-100',
    detailTitle: 'System Temperature',
    detailSub: 'Temperature (°C)',
    yMax: 120,
  },
];

function iconSvg(type) {
  const common = 'class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"';
  switch (type) {
    case 'speed':
      return `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    case 'bolt':
      return `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
    case 'chip':
      return `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2-6H3m18 0h-2m2 6h-2M5 15H3m18 0h-2m2-6h-2M7 7h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z"/></svg>`;
    case 'pulse':
      return `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h3l2-6 4 12 2-6h3"/></svg>`;
    case 'battery':
      return `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h2v4H3v-4zm4-2h12a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2zm14 3h1v2h-1v-2z"/></svg>`;
    case 'temp':
      return `<svg ${common}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 012-2h0a2 2 0 012 2v6a3 3 0 11-4 0z"/></svg>`;
    default:
      return `<svg ${common}><circle cx="12" cy="12" r="4"/></svg>`;
  }
}

function buildMetricGrid() {
  const icons = ['speed', 'bolt', 'chip', 'pulse', 'battery', 'temp'];
  els.metricGrid.innerHTML = METRICS.map((m, idx) => `
    <button type="button" data-metric="${m.key}" class="metric-tile group w-full text-left bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 hover:shadow-lg hover:border-cyan-200 transition focus:outline-none focus:ring-2 focus:ring-cyan-400/40">
      <div class="flex items-start gap-3">
        <div class="h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${m.accent}">
          ${iconSvg(icons[idx])}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-1">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${m.label}</span>
            <span class="text-[10px] text-slate-400">${m.unit}</span>
          </div>
          <div class="text-2xl font-bold text-slate-900 leading-tight mt-1 tabular-nums" data-inst="${m.key}">—</div>
          <div class="text-xs text-slate-500 mt-1">Avg: <span class="font-semibold text-slate-700 tabular-nums" data-avg="${m.key}">—</span></div>
        </div>
      </div>
    </button>
  `).join('');

  els.metricGrid.querySelectorAll('.metric-tile').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-metric');
      if (key) openMetricChart(key);
    });
  });
}

function isZeroish(x) {
  if (x === 0 || x === '0') return true;
  if (typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1e-9) return true;
  return false;
}

function avgNonZero(values) {
  const nz = values.filter((x) => !isZeroish(Number(x)));
  if (nz.length === 0) return null;
  const s = nz.reduce((a, b) => a + Number(b), 0);
  return s / nz.length;
}

function pushAvgHistory(key, val) {
  const arr = historyForAvg[key];
  arr.push(val);
  if (arr.length > MAX_AVG) arr.shift();
}

function formatInst(key, val) {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  if (key === 'tmp' || key === 'bat') return String(Math.round(Number(val)));
  if (key === 'spd') return Number(val).toFixed(1);
  return Number(val).toFixed(1);
}

function formatAvg(key, avg) {
  if (avg === null || avg === undefined || Number.isNaN(avg)) return '—';
  if (key === 'tmp' || key === 'bat') return String(Math.round(avg));
  if (key === 'spd') return avg.toFixed(1);
  return avg.toFixed(1);
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toR = (d) => (d * Math.PI) / 180;
  const toD = (r) => (r * 180) / Math.PI;
  const φ1 = toR(lat1);
  const φ2 = toR(lat2);
  const Δλ = toR(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toD(θ) + 360) % 360;
}

function updateHeadingFromGps(lat, lon) {
  if (lastLat !== null && lastLon !== null) {
    const d = haversineM(lastLat, lastLon, lat, lon);
    if (d > 1.2) {
      lastBearingDeg = bearingDeg(lastLat, lastLon, lat, lon);
    }
  }
  lastLat = lat;
  lastLon = lon;
  return lastBearingDeg;
}

function arrowIconHtml(deg) {
  return `
    <div class="arrow-rot" style="transform: rotate(${deg}deg); width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
        <path fill="#0284c7" stroke="#0369a1" stroke-width="0.5" d="M12 3 L21 20 L12 15.5 L3 20 Z" />
      </svg>
    </div>`;
}

function createArrowIcon(deg) {
  return L.divIcon({
    className: 'vehicle-arrow-icon',
    html: arrowIconHtml(deg),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function computeLinkOnline() {
  const socketOk = Boolean(socketRef && socketRef.connected);
  if (!socketOk) return false;
  if (!lastTelemetryAt) return false;
  if (Date.now() - lastTelemetryAt > DATA_SILENCE_MS) return false;
  return true;
}

function setConnectionUi() {
  const ok = computeLinkOnline();
  if (ok) {
    els.connText.textContent = 'Connection: Online';
    els.connText.classList.remove('text-red-700');
    els.connText.classList.add('text-emerald-700');
    els.connGlyph.classList.remove('border-slate-200', 'text-slate-400', 'bg-white');
    els.connGlyph.classList.add('border-emerald-300', 'bg-emerald-50', 'text-emerald-600', 'shadow-[0_0_12px_rgba(16,185,129,0.35)]');
    els.connGlyphSvg.classList.remove('text-slate-400', 'text-red-500');
    els.connGlyphSvg.classList.add('text-emerald-600');
  } else {
    els.connText.textContent = 'Connection: Offline';
    els.connText.classList.add('text-red-700');
    els.connText.classList.remove('text-emerald-700');
    els.connGlyph.classList.add('border-slate-200', 'bg-white', 'text-slate-400');
    els.connGlyph.classList.remove('border-emerald-300', 'bg-emerald-50', 'text-emerald-600', 'shadow-[0_0_12px_rgba(16,185,129,0.35)]');
    els.connGlyphSvg.classList.remove('text-emerald-600');
    els.connGlyphSvg.classList.add('text-red-500');
  }
}

function updateLastDataLine() {
  if (!lastTelemetryAt) {
    els.lastDataLine.textContent = 'Son veri: henüz yok';
    return;
  }
  const d = new Date(lastTelemetryAt);
  const main = d.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const sec = Math.max(0, Math.floor((Date.now() - lastTelemetryAt) / 1000));
  els.lastDataLine.textContent = `Son veri: ${main} · ${sec} sn önce`;
}

function showErr(msg) {
  els.errBanner.textContent = msg;
  els.errBanner.classList.remove('hidden');
  clearTimeout(showErr._t);
  showErr._t = setTimeout(() => els.errBanner.classList.add('hidden'), 7000);
}

function chartTextPluginDefaults() {
  Chart.defaults.color = '#64748b';
  Chart.defaults.borderColor = '#e2e8f0';
}

function trimSeries() {
  while (chartLabels.length > MAX_POINTS) {
    chartLabels.shift();
    Object.keys(series).forEach((k) => series[k].shift());
  }
}

function formatTimeLabel(ts) {
  const d = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([39.92, 32.85], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
  arrowMarker = L.marker([39.92, 32.85], { icon: createArrowIcon(0) }).addTo(map);
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 150);
}

function openMetricChart(metricKey) {
  if (metricChartPanels.has(metricKey)) return;
  const meta = METRICS.find((m) => m.key === metricKey);
  if (!meta) return;

  const wrap = document.createElement('div');
  wrap.className = 'bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 relative';
  wrap.dataset.metricPanel = metricKey;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-lg leading-none flex items-center justify-center border border-slate-200';
  closeBtn.setAttribute('aria-label', 'Kapat');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => closeMetricChartPanel(metricKey));

  const title = document.createElement('h3');
  title.className = 'font-bold text-slate-900 pr-10 text-sm';
  title.textContent = meta.detailTitle;

  const sub = document.createElement('p');
  sub.className = 'text-[11px] text-slate-500 mb-2';
  sub.textContent = meta.detailSub;

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'h-56';
  const canvas = document.createElement('canvas');
  canvas.id = `chart-${metricKey}-${Date.now()}`;
  canvasWrap.appendChild(canvas);

  wrap.appendChild(closeBtn);
  wrap.appendChild(title);
  wrap.appendChild(sub);
  wrap.appendChild(canvasWrap);
  els.multiChartHost.appendChild(wrap);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [...chartLabels],
      datasets: [{
        label: `${meta.label} (${meta.unit})`,
        data: [...series[metricKey]],
        borderColor: '#0891b2',
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 0,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { maxTicksLimit: 8 }, grid: { color: '#f1f5f9' } },
        y: { min: 0, suggestedMax: meta.yMax, grid: { color: '#f1f5f9' } },
      },
      plugins: { legend: { display: false } },
    },
  });

  metricChartPanels.set(metricKey, { wrap, chart });
}

function closeMetricChartPanel(metricKey) {
  const p = metricChartPanels.get(metricKey);
  if (!p) return;
  p.chart.destroy();
  p.wrap.remove();
  metricChartPanels.delete(metricKey);
}

function refreshOpenMetricCharts() {
  metricChartPanels.forEach((p, key) => {
    p.chart.data.labels = [...chartLabels];
    p.chart.data.datasets[0].data = [...series[key]];
    p.chart.update('none');
  });
}

function pushCharts(ts, t) {
  const lab = formatTimeLabel(ts);
  chartLabels.push(lab);
  series.spd.push(Number(t.spd));
  series.v.push(Number(t.v));
  series.i.push(Number(t.i));
  series.w.push(Number(t.w));
  series.bat.push(Number(t.bat));
  series.tmp.push(Number(t.tmp));
  trimSeries();
  refreshOpenMetricCharts();
}

function updateMetricTiles(t) {
  METRICS.forEach((m) => {
    const val = t[m.key];
    pushAvgHistory(m.key, val);
    const avg = avgNonZero(historyForAvg[m.key]);
    const instEl = document.querySelector(`[data-inst="${m.key}"]`);
    const avgEl = document.querySelector(`[data-avg="${m.key}"]`);
    if (instEl) instEl.textContent = formatInst(m.key, val);
    if (avgEl) avgEl.textContent = formatAvg(m.key, avg);
  });
}

function updateImu(t) {
  const fmt4 = (x) => (Number.isFinite(Number(x)) ? Number(x).toFixed(4) : '—');
  els.imuGx.textContent = fmt4(t.gx);
  els.imuGy.textContent = fmt4(t.gy);
  els.imuGz.textContent = fmt4(t.gz);
  els.imuAx.textContent = fmt4(t.ax);
  els.imuAy.textContent = fmt4(t.ay);
  els.imuAz.textContent = fmt4(t.az);
  els.imuMx.textContent = fmt4(t.mx);
  els.imuMy.textContent = fmt4(t.my);
  els.imuMz.textContent = fmt4(t.mz);
}

function setRecordingUi() {
  if (recording) {
    els.recStatus.textContent = 'Recording';
    els.btnRecord.disabled = true;
    els.btnRecord.classList.add('opacity-50', 'cursor-not-allowed');
    els.btnStopDownload.disabled = false;
    els.btnStopDownload.classList.remove('opacity-60', 'cursor-not-allowed');
  } else {
    els.recStatus.textContent = 'Standby';
    els.btnRecord.disabled = false;
    els.btnRecord.classList.remove('opacity-50', 'cursor-not-allowed');
    els.btnStopDownload.disabled = true;
    els.btnStopDownload.classList.add('opacity-60', 'cursor-not-allowed');
  }
}

function fmtRow(row) {
  return [
    row.received_at,
    row.lon, row.lat, row.h, row.m, row.s, row.alt,
    row.gx, row.gy, row.gz, row.ax, row.ay, row.az, row.tmp,
    row.mx, row.my, row.mz, row.v, row.i, row.w, row.wh, row.spd, row.bat,
  ].join(',');
}

const CSV_HEADER = [
  'received_at', 'lon', 'lat', 'h', 'm', 's', 'alt',
  'gx', 'gy', 'gz', 'ax', 'ay', 'az', 'tmp',
  'mx', 'my', 'mz', 'v', 'i', 'w', 'wh', 'spd', 'bat',
].join(',');

async function downloadCsv() {
  let suffix = '';
  let display = '';
  try {
    const r = await fetch('/api/server-time');
    const j = await r.json();
    suffix = j.filenameSuffix || '';
    display = j.display || j.iso || '';
  } catch (_) {
    const d = new Date();
    suffix = d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    display = d.toLocaleString();
  }
  const lines = [
    `# Server datetime: ${display}`,
    CSV_HEADER,
    ...csvBuffer.map(fmtRow),
  ];
  const blob = new Blob([`\ufeff${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `telemetry_${suffix}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function applyTelemetry(t) {
  const ts = t.server_ts || t.received_at;
  lastTelemetryAt = Date.now();
  const lat = Number(t.lat);
  const lon = Number(t.lon);
  els.coordPill.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

  const deg = updateHeadingFromGps(lat, lon);
  if (map && arrowMarker) {
    arrowMarker.setLatLng([lat, lon]);
    arrowMarker.setIcon(createArrowIcon(deg));
    map.panTo([lat, lon], { animate: true, duration: 0.3 });
  }

  updateMetricTiles(t);
  updateImu(t);
  pushCharts(ts, t);
  updateLastDataLine();
  setConnectionUi();

  if (recording) csvBuffer.push({ ...t });
}

function initSocket() {
  const socket = io({ transports: ['websocket', 'polling'] });
  socketRef = socket;

  socket.on('connect', () => {
    setConnectionUi();
  });
  socket.on('disconnect', () => {
    setConnectionUi();
  });
  socket.on('connect_error', () => {
    setConnectionUi();
  });
  socket.on('status', () => {
    setConnectionUi();
  });
  socket.on('telemetry', (t) => {
    applyTelemetry(t);
  });
  socket.on('telemetry_error', (e) => {
    showErr(e.message || JSON.stringify(e));
  });
}

els.btnRecord.addEventListener('click', () => {
  recording = true;
  csvBuffer = [];
  setRecordingUi();
});

els.btnStopDownload.addEventListener('click', async () => {
  if (!recording) return;
  recording = false;
  setRecordingUi();
  await downloadCsv();
});

window.addEventListener('DOMContentLoaded', () => {
  chartTextPluginDefaults();
  buildMetricGrid();
  initMap();
  initSocket();
  setRecordingUi();
  setConnectionUi();
  updateLastDataLine();

  setInterval(() => {
    updateLastDataLine();
    setConnectionUi();
  }, 1000);
});
