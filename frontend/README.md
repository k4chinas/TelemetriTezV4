# TelemetriTezV2 — Next.js Arayüz

React/Next.js tabanlı telemetri dashboard. TelemetriTezV2 backend sunucusuna Socket.IO ile bağlanır.

## Kurulum

```bash
npm install        # (ya da pnpm install / yarn)
cp .env.local.example .env.local
# .env.local içindeki NEXT_PUBLIC_SERVER_URL'yi sunucu adresinize göre düzenleyin
npm run dev        # Geliştirme: http://localhost:3000
npm run build && npm start   # Üretim
```

## Ortam Değişkenleri

`.env.local` dosyası oluşturun:

```
NEXT_PUBLIC_SERVER_URL=http://localhost:1881
```

Sunucu farklı bir makinedeyse IP adresini girin:
```
NEXT_PUBLIC_SERVER_URL=http://192.168.1.100:1881
```

## Veri Alanı Eşleştirmesi (Sunucu → Arayüz)

| Sunucu | Arayüz | Açıklama |
|--------|--------|----------|
| `tmp` | `temp` | Sıcaklık (°C) |
| `v` | `voltage` | Voltaj (V) |
| `i` | `current` | Akım (A) |
| `w` | `watt` | Güç (W) |
| `wh` | `wattHour` | Enerji (Wh) |
| `spd` | `speed` | Hız (km/h) |
| `bat` | `remainingEnergy` | Kalan enerji (%) |
| `gx/gy/gz` | `gx/gy/gz` | Jiroskop |
| `ax/ay/az` | `ax/ay/az` | İvmeölçer |
| `mx/my/mz` | `mx/my/mz` | Manyetometre |
| `lat/lon` | `lat/lon` | GPS koordinatları |
