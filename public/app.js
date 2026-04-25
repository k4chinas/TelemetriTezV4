// --- DEĞİŞKENLER VE DURUMLAR ---
let telemetryData = [];
let isRecording = false;
let isPaused = false;
let recordedRows = [];
let lastDataTime = 0;
const CONNECTION_TIMEOUT = 60000; // 1 dakika (60 saniye) veri gelmezse Offline

// Harita Değişkenleri
let map, marker, satelliteLayer, defaultLayer;
let isSatellite = true;
let lastLat = 0, lastLon = 0;

// Grafikler İçin Obje
const charts = {};
const chartHistory = { speed: [], voltage: [], current: [], power: [], energy: [], battery: [], time: [] };
const MAX_CHART_POINTS = 30;

// --- İLK KURULUM (INIT) ---
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initCharts();
    setupThemeToggle();
    setupRecordingControls();

    // FIX #3: Socket.IO bağlantısı — gerçek zamanlı veri için birincil yol
    // Önceden socket.io hiç kullanılmıyordu; TCP'den gelen veriler dashboard'a ulaşmıyordu.
    const socket = io();

    socket.on('connect', () => {
        console.log('[Socket.IO] Bağlandı:', socket.id);
    });

    // Sunucu bağlantı durumunu doğrudan bildiriyor
    socket.on('status', ({ online }) => {
        updateConnectionStatus(online);
        if (online) lastDataTime = Date.now();
    });

    // Gerçek zamanlı telemetri verisi (TCP veya HTTP POST kaynaklı)
    socket.on('telemetry', (data) => {
        updateUI(data);
        handleRecording(data);
        lastDataTime = Date.now();
        updateConnectionStatus(true);
        const now = new Date();
        document.getElementById('last-time').textContent =
            `${now.toLocaleTimeString()} | ${now.toLocaleDateString()}`;
    });

    socket.on('telemetry_error', ({ message, detail }) => {
        console.warn('[Telemetri Hatası]', message, detail || '');
    });

    socket.on('disconnect', () => {
        console.log('[Socket.IO] Bağlantı kesildi');
        updateConnectionStatus(false);
    });

    // Sayfa ilk açıldığında son kaydı REST'ten çek (Socket.IO henüz veri göndermeden önce)
    fetchLatestTelemetry();

    // Bağlantı kontrol döngüsü (veri gelmeyi bırakırsa Offline yap)
    setInterval(checkConnection, 1000);
});

// --- İLK YÜKLEMEDEKİ REST SORGULAMA ---
// Sadece sayfa yüklenirken son satırı çeker; sonrasını Socket.IO halleder.
async function fetchLatestTelemetry() {
    try {
        // FIX #4: Doğru endpoint — önceden sadece /api/telemetry vardı, frontend /api/v1/telemetry arıyordu
        const response = await fetch('/api/v1/telemetry?limit=1');
        if (!response.ok) return;
        const data = await response.json();
        // FIX #5: Yanıt { ok, count, rows:[...] } formatında gelir; önceden tüm nesne updateUI'a gönderiliyordu
        if (data && data.ok && data.rows && data.rows.length > 0) {
            const latest = data.rows[data.rows.length - 1];
            updateUI(latest);
            lastDataTime = Date.now();
            updateConnectionStatus(true);
            const now = new Date();
            document.getElementById('last-time').textContent =
                `${now.toLocaleTimeString()} | ${now.toLocaleDateString()}`;
        }
    } catch (error) {
        // Sunucu henüz hazır değil — sessizce geç
    }
}

function checkConnection() {
    if (lastDataTime > 0 && Date.now() - lastDataTime > CONNECTION_TIMEOUT) {
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(isOnline) {
    const el = document.getElementById('connection-status');
    const text = document.getElementById('conn-text');
    if (isOnline) {
        el.className = 'status-badge online';
        text.textContent = 'Online';
    } else {
        el.className = 'status-badge offline';
        text.textContent = 'Offline';
    }
}

// --- ARAYÜZ GÜNCELLEME ---
function updateUI(data) {
    // FIX #6: Tüm alan adları düzeltildi.
    // Sunucu kısa adlar gönderiyor: spd, v, i, w, wh, bat, tmp, alt
    // Önceki kod data.speed, data.voltage vb. arıyordu — bunlar hiçbir zaman gelmiyordu.

    // 1. Ana Metrikler
    updateMetricCard('speed',  data.spd  || 0);
    updateMetricCard('volt',   data.v    || 0);
    updateMetricCard('curr',   data.i    || 0);
    updateMetricCard('power',  data.w    || 0);
    updateMetricCard('energy', data.wh   || 0);
    updateMetricCard('batt',   data.bat  || 0);

    // 2. MPU Sensörleri
    document.getElementById('mpu-temp').textContent = (data.tmp || 0).toFixed(2);
    document.getElementById('gx-val').textContent = (data.gx || 0).toFixed(2);
    document.getElementById('gy-val').textContent = (data.gy || 0).toFixed(2);
    document.getElementById('gz-val').textContent = (data.gz || 0).toFixed(2);
    document.getElementById('ax-val').textContent = (data.ax || 0).toFixed(2);
    document.getElementById('ay-val').textContent = (data.ay || 0).toFixed(2);
    document.getElementById('az-val').textContent = (data.az || 0).toFixed(2);
    document.getElementById('mx-val').textContent = (data.mx || 0).toFixed(2);
    document.getElementById('my-val').textContent = (data.my || 0).toFixed(2);
    document.getElementById('mz-val').textContent = (data.mz || 0).toFixed(2);

    // 3. Harita ve Konum
    if (data.lat && data.lon) {
        document.getElementById('lat-val').textContent = data.lat.toFixed(6);
        document.getElementById('lon-val').textContent = data.lon.toFixed(6);
        // FIX: data.altitude → data.alt
        document.getElementById('alt-val').textContent = (data.alt || 0).toFixed(1);
        updateMap(data.lat, data.lon);
    }

    // 4. Grafikleri Güncelle
    updateCharts(data);
}

function updateMetricCard(prefix, currentValue) {
    document.getElementById(`${prefix}-val`).textContent = currentValue;

    if (!telemetryData[prefix]) telemetryData[prefix] = [];
    telemetryData[prefix].push(parseFloat(currentValue));
    if (telemetryData[prefix].length > 30) telemetryData[prefix].shift();

    const avg = telemetryData[prefix].reduce((a, b) => a + b, 0) / telemetryData[prefix].length;
    document.getElementById(`${prefix}-avg`).textContent = avg.toFixed(1);
}

// --- HARİTA VE YÖN BULMA (GPS) ---
function initMap() {
    map = L.map('map').setView([39.92077, 32.85411], 15);

    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
    defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });

    satelliteLayer.addTo(map);

    const arrowIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div id="map-arrow" style="transform: rotate(0deg); font-size: 24px; color: red; text-shadow: 0 0 5px white;">➤</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    marker = L.marker([39.92077, 32.85411], { icon: arrowIcon }).addTo(map);

    document.getElementById('btn-map-toggle').addEventListener('click', () => {
        if (isSatellite) {
            map.removeLayer(satelliteLayer);
            defaultLayer.addTo(map);
        } else {
            map.removeLayer(defaultLayer);
            satelliteLayer.addTo(map);
        }
        isSatellite = !isSatellite;
    });
}

function updateMap(lat, lon) {
    if (lastLat !== 0 && lastLon !== 0) {
        const dy = lat - lastLat;
        const dx = Math.cos(Math.PI / 180 * lastLat) * (lon - lastLon);
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        angle = (90 - angle + 360) % 360;
        const arrow = document.getElementById('map-arrow');
        if (arrow) arrow.style.transform = `rotate(${angle - 90}deg)`;
    }
    const newLatLng = new L.LatLng(lat, lon);
    marker.setLatLng(newLatLng);
    map.panTo(newLatLng);
    lastLat = lat;
    lastLon = lon;
}

// --- KART GENİŞLETME VE GRAFİKLER ---
function toggleCard(metric) {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        if (card.getAttribute('onclick').includes(metric)) {
            card.classList.toggle('expanded');
            card.style.borderBottomColor = card.classList.contains('expanded') ? 'transparent' : card.dataset.color;
        }
    });
}

function initCharts() {
    Chart.defaults.color = '#a1a1aa';
    Chart.defaults.font.family = 'monospace';

    createChart('chart-speed',   'Hız (km/h)',   '#ef4444');
    createChart('chart-voltage', 'Voltaj (V)',   '#eab308');
    createChart('chart-current', 'Akım (A)',     '#3b82f6');
    createChart('chart-power',   'Güç (W)',      '#a855f7');
    createChart('chart-energy',  'Enerji (Wh)',  '#06b6d4');
    createChart('chart-battery', 'Batarya (%)',  '#22c55e');
}

function createChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '33',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: '#27272a' } } },
            animation: false
        }
    });
}

function updateCharts(data) {
    const time = new Date().toLocaleTimeString();
    chartHistory.time.push(time);
    // FIX #7: Grafik alan adları da düzeltildi (spd, v, i, w, wh, bat)
    chartHistory.speed.push(data.spd   || 0);
    chartHistory.voltage.push(data.v   || 0);
    chartHistory.current.push(data.i   || 0);
    chartHistory.power.push(data.w     || 0);
    chartHistory.energy.push(data.wh   || 0);
    chartHistory.battery.push(data.bat || 0);

    if (chartHistory.time.length > MAX_CHART_POINTS) {
        for (let key in chartHistory) chartHistory[key].shift();
    }

    updateSingleChart('chart-speed',   chartHistory.speed);
    updateSingleChart('chart-voltage', chartHistory.voltage);
    updateSingleChart('chart-current', chartHistory.current);
    updateSingleChart('chart-power',   chartHistory.power);
    updateSingleChart('chart-energy',  chartHistory.energy);
    updateSingleChart('chart-battery', chartHistory.battery);
}

function updateSingleChart(canvasId, dataArr) {
    charts[canvasId].data.labels = chartHistory.time;
    charts[canvasId].data.datasets[0].data = dataArr;
    charts[canvasId].update();
}

// --- KAYIT (RECORDING) MEKANİZMASI ---
function setupRecordingControls() {
    const btnStart  = document.getElementById('btn-start-record');
    const btnPause  = document.getElementById('btn-pause-record');
    const btnResume = document.getElementById('btn-resume-record');
    const btnFinish = document.getElementById('btn-finish-record');

    const divActive = document.getElementById('recording-active');
    const divPaused = document.getElementById('recording-paused');
    const countBadge = document.getElementById('record-count');

    btnStart.addEventListener('click', () => {
        isRecording = true; isPaused = false; recordedRows = [];
        btnStart.classList.add('hidden');
        divActive.classList.remove('hidden');
        countBadge.textContent = '0 satır';
    });

    btnPause.addEventListener('click', () => {
        isPaused = true;
        divActive.classList.add('hidden');
        divPaused.classList.remove('hidden');
    });

    btnResume.addEventListener('click', () => {
        isPaused = false;
        divPaused.classList.add('hidden');
        divActive.classList.remove('hidden');
    });

    btnFinish.addEventListener('click', () => {
        isRecording = false; isPaused = false;
        divPaused.classList.add('hidden');
        btnStart.classList.remove('hidden');
        downloadCSV();
    });
}

function handleRecording(data) {
    if (isRecording && !isPaused) {
        data.timestamp = new Date().toISOString();
        recordedRows.push(data);
        document.getElementById('record-count').textContent = `${recordedRows.length} satır`;
    }
}

function downloadCSV() {
    if (recordedRows.length === 0) return alert('Kaydedilecek veri bulunamadı.');

    const headers = Object.keys(recordedRows[0]).join(',');
    const csvContent = recordedRows.map(row => Object.values(row).join(',')).join('\n');
    const finalCSV = headers + '\n' + csvContent;

    const blob = new Blob([finalCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `telemetri_kayit_${new Date().getTime()}.csv`);
    a.click();
}

// --- TEMA AYARI ---
function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    btn.addEventListener('click', () => {
        const html = document.documentElement;
        if (html.getAttribute('data-theme') === 'dark') {
            html.setAttribute('data-theme', 'light');
            btn.textContent = '🌙';
            Chart.defaults.color = '#52525b';
        } else {
            html.setAttribute('data-theme', 'dark');
            btn.textContent = '☀️';
            Chart.defaults.color = '#a1a1aa';
        }
        Object.values(charts).forEach(c => c.update());
    });
}
