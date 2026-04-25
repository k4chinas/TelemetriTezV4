/**
 * Telemetri JSON doğrulama ve normalize (sunucu tarafı tipler).
 * @param {unknown} raw
 * @returns {object} normalize edilmiş düz nesne
 */
function validateTelemetry(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Geçersiz gövde: nesne bekleniyor');
  }

  const o = /** @type {Record<string, unknown>} */ (raw);

  const req = [
    'lon', 'lat', 'h', 'm', 's', 'alt',
    'gx', 'gy', 'gz', 'ax', 'ay', 'az', 'tmp',
    'mx', 'my', 'mz', 'v', 'i', 'w', 'wh', 'spd', 'bat',
  ];
  for (const k of req) {
    if (!(k in o)) throw new Error(`Eksik alan: ${k}`);
  }

  const lon = mustFloat(o.lon, 'lon');
  const lat = mustFloat(o.lat, 'lat');
  const gx = mustFloat(o.gx, 'gx');
  const gy = mustFloat(o.gy, 'gy');
  const gz = mustFloat(o.gz, 'gz');
  const ax = mustFloat(o.ax, 'ax');
  const ay = mustFloat(o.ay, 'ay');
  const az = mustFloat(o.az, 'az');
  const mx = mustFloat(o.mx, 'mx');
  const my = mustFloat(o.my, 'my');
  const mz = mustFloat(o.mz, 'mz');
  const v = mustFloat(o.v, 'v');
  const i = mustFloat(o.i, 'i');
  const w = mustFloat(o.w, 'w');
  const wh = mustFloat(o.wh, 'wh');

  const h = mustInt(o.h, 'h');
  const m = mustInt(o.m, 'm');
  const s = mustInt(o.s, 's');
  const alt = mustInt(o.alt, 'alt');
  const tmp = mustInt(o.tmp, 'tmp');
  const spd = mustInt(o.spd, 'spd');
  const bat = mustInt(o.bat, 'bat');

  return {
    lon: roundTo(lon, 6),
    lat: roundTo(lat, 6),
    h, m, s, alt, tmp, spd, bat,
    gx: roundTo(gx, 4),
    gy: roundTo(gy, 4),
    gz: roundTo(gz, 4),
    ax: roundTo(ax, 4),
    ay: roundTo(ay, 4),
    az: roundTo(az, 4),
    mx: roundTo(mx, 4),
    my: roundTo(my, 4),
    mz: roundTo(mz, 4),
    v: roundTo(v, 2),
    i: roundTo(i, 2),
    w: roundTo(w, 2),
    wh: roundTo(wh, 2),
  };
}

function mustFloat(v, name) {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) throw new Error(`Geçersiz sayı: ${name}`);
  return n;
}

function mustInt(v, name) {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) throw new Error(`Geçersiz tamsayı: ${name}`);
  const r = Math.round(n);
  if (Math.abs(n - r) > 1e-6) throw new Error(`Tamsayı bekleniyor: ${name}`);
  return r;
}

function roundTo(n, decimals) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

module.exports = { validateTelemetry };
