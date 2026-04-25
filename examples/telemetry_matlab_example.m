%% Telemetri CSV veya .mat dosyasını MATLAB'ta kullanma örneği
% Python ile üretilen dosyalar:
%   fetch_telemetry.py --out telemetry.csv
%   fetch_telemetry.py --out telemetry.csv --mat telemetry.mat

%% 1) CSV ile (önerilir: readtable + analiz)
csvPath = 'telemetry.csv';  % fetch_telemetry.py --out ile ürettiğiniz dosya
opts = detectImportOptions(csvPath, 'Delimiter', ',');
T = readtable(csvPath, opts);

% Sunucu ISO zamanı (ör. 2026-04-25T14:30:00.123Z) — MATLAB sürümüne göre otomatik veya:
if ~isdatetime(T.received_at)
    try
        T.received_at = datetime(T.received_at, 'TimeZone', 'UTC');
    catch
        T.received_at = datetime(T.received_at, 'InputFormat', 'yyyy-MM-dd''T''HH:mm:ss.SSS''Z''', 'TimeZone', 'UTC');
    end
end

figure;
plot(T.received_at, T.v);
xlabel('Zaman'); ylabel('FC voltaj (V)');
title('Telemetri');

%% 2) .mat ile (Python: pip install scipy numpy sonra --mat telemetry.mat)
% load('telemetry.mat');  % id, lon, lat, v, ... vektörleri gelir
% plot(datetime(received_at, 'InputFormat', '...'), v);
