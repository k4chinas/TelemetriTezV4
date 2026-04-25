# TelemetriTezV2 — Backend Sunucu

Node.js tabanlı telemetri sunucusu. STM32/SIM800C donanımından gelen ham TCP verilerini alır, SQLite'a kaydeder ve Socket.IO üzerinden arayüze canlı olarak iletir.

## Kurulum

```bash
npm install
cp .env.example .env   # Gerekirse port/yol ayarlarını düzenle
npm start
```

Sunucu **http://localhost:1881** adresinde çalışır.

## API Uç Noktaları

| Method | Yol | Açıklama |
|--------|-----|----------|
| GET | `/api/telemetry` | Geçmiş veri sorgusu (`?since=&until=&limit=&offset=`) |
| POST | `/api/v1/telemetry` | GSM/HTTP'den telemetri gönderimi |
| GET | `/api/server-time` | Sunucu saati |

## Socket.IO Olayları

| Olay | Yön | Açıklama |
|------|-----|----------|
| `status` | Sunucu→İstemci | `{ online: bool }` — cihaz durumu |
| `telemetry` | Sunucu→İstemci | Gerçek zamanlı telemetri paketi |
