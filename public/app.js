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
const MAX_CHART_POINTS = 30; // Grafikte gözükecek maksimum nokta sayısı

// --- İLK KURULUM (INIT) ---
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    initCharts();
    setupThemeToggle();
    setupRecordingControls();
    
    // Veri çekme döngüsü (1 saniyede bir)
    setInterval(fetchTelemetry, 1000);
    // Bağlantı kontrol döngüsü
    setInterval(checkConnection, 1000);
});

// --- VERİ ÇEKME VE İŞLEME ---
async function fetchTelemetry() {
    try {
        const response = await fetch('/api/v1/telemetry');
        if (!response.ok) return;
        
        const data = await response.json();
        if (data) {
            updateUI(data);
            handleRecording(data);
            
            // Bağlantı durumunu güncelle
            lastDataTime = Date.now();
            updateConnectionStatus(true);
            
            // Tarih Saat
            const now = new Date();
            document.getElementById('last-time').textContent = 
                `${now.toLocaleTimeString()} | ${now.toLocaleDateString()}`;
        }
    } catch (error) {
        // API'ye ulaşılamıyor (Sunucu kapalı vs)
    }
}

function checkConnection() {
    if (Date.now() - lastDataTime > CONNECTION_TIMEOUT) {
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
    // 1. Ana Metrikler
    updateMetricCard('speed', data.speed || 0);
    updateMetricCard('volt', data.voltage || 0);
    updateMetricCard('curr', data.current || 0);
    updateMetricCard('power', data.power || 0);
    updateMetricCard('energy', data.energy || 0);
    updateMetricCard('batt', data.battery || 0);

    // 2. MPU Sensörleri
    document.getElementById('mpu-temp').textContent = (data.temp || 0).toFixed(2);
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
        document.getElementById('alt-val').textContent = (data.altitude || 0).toFixed(1);
        
        updateMap(data.lat, data.lon);
    }

    // 4. Grafikleri Güncelle
    updateCharts(data);
}

function updateMetricCard(prefix, currentValue) {
    document.getElementById(`${prefix}-val`).textContent = currentValue;
    
    // Basit Ortalama Hesabı (Son 30 veri)
    if(!telemetryData[prefix]) telemetryData[prefix] = [];
    telemetryData[prefix].push(parseFloat(currentValue));
    if(telemetryData[prefix].length > 30) telemetryData[prefix].shift();
    
    const avg = telemetryData[prefix].reduce((a,b)=>a+b,0) / telemetryData[prefix].length;
    document.getElementById(`${prefix}-avg`).textContent = avg.toFixed(1);
}

// --- HARİTA VE YÖN BULMA (GPS) ---
function initMap() {
    map = L.map('map').setView([39.92077, 32.85411], 15); // Başlangıç Ankara
    
    // Uydu ve Normal Harita Katmanları
    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
    defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    
    satelliteLayer.addTo(map);

    // Özel Yön Gösteren Ok İkonu (SVG)
    const arrowIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div id="map-arrow" style="transform: rotate(0deg); font-size: 24px; color: red; text-shadow: 0 0 5px white;">➤</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    marker = L.marker([39.92077, 32.85411], {icon: arrowIcon}).addTo(map);

    // Harita Değiştirme Butonu
    document.getElementById('btn-map-toggle').addEventListener('click', () => {
        if(isSatellite) {
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
    // Yön Hesaplama (Heading)
    if (lastLat !== 0 && lastLon !== 0) {
        const dy = lat - lastLat;
        const dx = Math.cos(Math.PI/180*lastLat) * (lon - lastLon);
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        angle = (90 - angle + 360) % 360; // Kuzeye göre dereceye çevir
        
        const arrow = document.getElementById('map-arrow');
        if(arrow) arrow.style.transform = `rotate(${angle - 90}deg)`;
    }
    
    const newLatLng = new L.LatLng(lat, lon);
    marker.setLatLng(newLatLng);
    map.panTo(newLatLng);
    
    lastLat = lat;
    lastLon = lon;
}

// --- KART GENİŞLETME VE GRAFİKLER ---
function toggleCard(metric) {
    // Tıklanan karta 'expanded' sınıfını ekle/çıkar
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        if(card.getAttribute('onclick').includes(metric)) {
            card.classList.toggle('expanded');
            // Genişlediğinde kartın alt çizgi rengini alıp grafik güncellenir
            card.style.borderBottomColor = card.classList.contains('expanded') ? 'transparent' : card.dataset.color;
        }
    });
}

function initCharts() {
    Chart.defaults.color = '#a1a1aa';
    Chart.defaults.font.family = 'monospace';
    
    createChart('chart-speed', 'Hız (km/h)', '#ef4444');
    createChart('chart-voltage', 'Voltaj (V)', '#eab308');
    createChart('chart-current', 'Akım (A)', '#3b82f6');
    createChart('chart-power', 'Güç (W)', '#a855f7');
    createChart('chart-energy', 'Enerji (Wh)', '#06b6d4');
    createChart('chart-battery', 'Batarya (%)', '#22c55e');
}

function createChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: label, data: [], borderColor: color, backgroundColor: color + '33', borderWidth: 2, fill: true, tension: 0.4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { grid: { color: '#27272a' } } },
            animation: false // Performans için animasyonu kapat
        }
    });
}

function updateCharts(data) {
    const time = new Date().toLocaleTimeString();
    chartHistory.time.push(time);
    chartHistory.speed.push(data.speed || 0);
    chartHistory.voltage.push(data.voltage || 0);
    chartHistory.current.push(data.current || 0);
    chartHistory.power.push(data.power || 0);
    chartHistory.energy.push(data.energy || 0);
    chartHistory.battery.push(data.battery || 0);

    if (chartHistory.time.length > MAX_CHART_POINTS) {
        for (let key in chartHistory) chartHistory[key].shift();
    }

    // Aktif olan chartları güncelle
    updateSingleChart('chart-speed', chartHistory.speed);
    updateSingleChart('chart-voltage', chartHistory.voltage);
    updateSingleChart('chart-current', chartHistory.current);
    updateSingleChart('chart-power', chartHistory.power);
    updateSingleChart('chart-energy', chartHistory.energy);
    updateSingleChart('chart-battery', chartHistory.battery);
}

function updateSingleChart(canvasId, dataArr) {
    charts[canvasId].data.labels = chartHistory.time;
    charts[canvasId].data.datasets[0].data = dataArr;
    charts[canvasId].update();
}

// --- KAYIT (RECORDING) MEKANİZMASI ---
function setupRecordingControls() {
    const btnStart = document.getElementById('btn-start-record');
    const btnPause = document.getElementById('btn-pause-record');
    const btnResume = document.getElementById('btn-resume-record');
    const btnFinish = document.getElementById('btn-finish-record');
    
    const divActive = document.getElementById('recording-active');
    const divPaused = document.getElementById('recording-paused');
    const countBadge = document.getElementById('record-count');

    btnStart.addEventListener('click', () => {
        isRecording = true; isPaused = false; recordedRows = [];
        btnStart.classList.add('hidden');
        divActive.classList.remove('hidden');
        countBadge.textContent = "0 satır";
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
    if (recordedRows.length === 0) return alert("Kaydedilecek veri bulunamadı.");
    
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
        // Tüm chartları yeni tema rengiyle yenile
        Object.values(charts).forEach(c => c.update());
    });
}