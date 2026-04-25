/**
 * GSM_BuildTelemetryJSON (Türkçe / PascalCase) veya kanonik (küçük harf) gövdeyi
 * validateTelemetry() girişine dönüştürür.
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
function normalizeIncomingPayload(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Geçersiz gövde');
  }
  const o = /** @type {Record<string, unknown>} */ (body);

  function pick(keys) {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined && o[k] !== null) {
        return o[k];
      }
    }
    const entries = Object.keys(o);
    for (const k of keys) {
      const low = k.toLowerCase();
      const found = entries.find((ek) => ek.toLowerCase() === low);
      if (found !== undefined && o[found] !== undefined && o[found] !== null) {
        return o[found];
      }
    }
    return undefined;
  }

  const out = {
    lon: pick(['lon', 'Lon', 'LON']),
    lat: pick(['lat', 'Lat', 'LAT']),
    h: pick(['h', 'H', 'Saat', 'saat']),
    m: pick(['m', 'M', 'Dakika', 'dakika']),
    s: pick(['s', 'S', 'Saniye', 'saniye']),
    alt: pick(['alt', 'Alt', 'Yukseklik', 'yukseklik']),
    gx: pick(['gx', 'Gx', 'GX']),
    gy: pick(['gy', 'Gy', 'GY']),
    gz: pick(['gz', 'Gz', 'GZ']),
    ax: pick(['ax', 'Ax', 'AX']),
    ay: pick(['ay', 'Ay', 'AY']),
    az: pick(['az', 'Az', 'AZ']),
    tmp: pick(['tmp', 'Tmp', 'TMP', 'Sicaklik', 'sicaklik']),
    mx: pick(['mx', 'Mx', 'MX']),
    my: pick(['my', 'My', 'MY']),
    mz: pick(['mz', 'Mz', 'MZ']),
    v: pick(['v', 'V', 'Voltaj', 'voltaj']),
    i: pick(['i', 'I', 'Akim', 'akim']),
    w: pick(['w', 'W', 'Watt', 'watt']),
    wh: pick(['wh', 'Wh', 'WH', 'WattSaat', 'wattSaat']),
    spd: pick(['spd', 'Spd', 'SPD', 'Hiz', 'hiz']),
    bat: pick(['bat', 'Bat', 'BAT', 'Kalan_Enerji', 'kalanEnerji']),
  };

  return out;
}

module.exports = { normalizeIncomingPayload };
