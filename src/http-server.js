const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const device = require('./device-state');
const { validateTelemetry } = require('./validator');
const { normalizeIncomingPayload } = require('./payload-normalize');

/**
 * @param {import('./config')} config
 * @param {{
 *   queryTelemetry?: (o: object) => object[],
 *   insertTelemetry?: (row: object) => void,
 * }} [store]
 */
function createHttpServer(config, store = null) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: true },
  });

  app.use(express.json({ limit: '48kb' }));

  // Telemetri sorgulama — /api/telemetry ve /api/v1/telemetry aynı handler'ı paylaşır
  function handleQueryTelemetry(req, res) {
    if (!store || typeof store.queryTelemetry !== 'function') {
      res.status(503).json({ ok: false, error: 'Sorgu kullanılamıyor' });
      return;
    }
    try {
      const since = req.query.since ? String(req.query.since) : undefined;
      const until = req.query.until ? String(req.query.until) : undefined;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
      const offset = req.query.offset !== undefined ? Number(req.query.offset) : undefined;
      const rows = store.queryTelemetry({ since, until, limit, offset });
      res.json({
        ok: true,
        count: rows.length,
        rows,
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  }

  // FIX #1: /api/v1/telemetry GET endpoint eksikti — frontend bunu arıyordu ama sadece
  //         /api/telemetry tanımlıydı. İkisi de aynı handler'a bağlandı.
  app.get('/api/telemetry', handleQueryTelemetry);
  app.get('/api/v1/telemetry', handleQueryTelemetry);

  app.post('/api/v1/telemetry', (req, res) => {
    if (!store || typeof store.insertTelemetry !== 'function') {
      res.status(503).json({ ok: false, error: 'Kayıt kullanılamıyor' });
      return;
    }
    try {
      const normalized = normalizeIncomingPayload(req.body);
      const data = validateTelemetry(normalized);
      const receivedAt = new Date().toISOString();
      const serverTs = Date.now();
      store.insertTelemetry({ ...data, received_at: receivedAt });
      io.emit('telemetry', { ...data, server_ts: serverTs, received_at: receivedAt });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  });

  app.get('/api/server-time', (_req, res) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const mo = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const mi = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    const filenameSuffix = `${y}-${mo}-${d}_${h}-${mi}-${s}`;
    res.json({
      iso: now.toISOString(),
      filenameSuffix,
      display: `${y}-${mo}-${d} ${h}:${mi}:${s}`,
    });
  });

  app.use(express.static(config.publicDir));

  io.on('connection', (socket) => {
    socket.emit('status', { online: device.isOnline() });
  });

  return { app, server, io };
}

module.exports = { createHttpServer };
