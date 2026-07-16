#include <WiFi.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <HTTPClient.h>
#include <LittleFS.h>

// ── Konfigurasi Pin ──────────────────────────────────────────
#define GPS_RX 14
#define GPS_TX 12
#define GSM_RX 16
#define GSM_TX 17

// ── Inisialisasi Komponen ────────────────────────────────────
HardwareSerial GPSSerial(1);
HardwareSerial GSMSerial(2);
TinyGPSPlus gps;

// ── Konfigurasi Jaringan ─────────────────────────────────────
const char* ssid = "SiHijau";
const char* pass = "bukananakTRPL";
const char* serverUrl = "https://kamangmakmur.online/api/sync.php";

int activeVehicleId = 4;

// Timer Pengiriman Data (30 Detik)
unsigned long lastSend = 0;
const long interval = 30000;
bool gsmInitialized = false;

// Timer untuk coba sambung ulang WiFi tanpa memblokir loop utama
unsigned long lastWifiRetry = 0;
const long wifiRetryInterval = 20000; // coba tiap 20 detik selama WiFi belum tersambung

// ── Konfigurasi Antrian Offline (disimpan di flash lewat LittleFS) ──────
// Kalau tidak ada jaringan sama sekali (WiFi mati DAN SIM800L gagal),
// titik GPS disimpan ke sini dulu, lalu dikirim ulang begitu jaringan
// kembali ada. Karena disimpan di flash (bukan RAM), antrian ini TETAP
// AMAN walau ESP32 mati listrik/restart di tengah jalan.
const char* QUEUE_FILE = "/queue.csv";
const int MAX_QUEUE_POINTS = 100;   // ~50 menit data pada interval kirim 30 detik
const int MAX_FLUSH_PER_CYCLE = 3;  // maksimal titik lama yang dicoba kirim ulang tiap loop

// ── Deklarasi Fungsi ──────────────────────────────────────────
void initSIM800L();
void tryReconnectWiFi();
bool kirimData(float lat, float lng, int vehicleId);
bool kirimDataWiFi(float lat, float lng, int vehicleId);
bool kirimDataGSM(float lat, float lng, int vehicleId);
bool waitForGsmResponse(const char* expected, unsigned long timeoutMs);
int countQueueLines();
void enqueuePoint(float lat, float lng);
void dropOldestQueueLine();
void flushQueue();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- ESP32 MULTI-COMMUNICATION TRACKER ---");

  GPSSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  GSMSerial.begin(9600, SERIAL_8N1, GSM_RX, GSM_TX);

  // Siapkan penyimpanan antrian offline. "true" = format otomatis
  // kalau partisi LittleFS belum pernah dipakai sebelumnya.
  if (!LittleFS.begin(true)) {
    Serial.println("[FATAL] LittleFS gagal di-mount! Antrian offline TIDAK akan berfungsi.");
  } else {
    Serial.printf("[OK] LittleFS siap. Titik tertunda saat ini: %d\n", countQueueLines());
  }

  // Mencoba WiFi Utama
  Serial.println("Mencoba menghubungkan ke WiFi...");
  WiFi.begin(ssid, pass);
  for (int i = 0; i < 15; i++) {
    if (WiFi.status() == WL_CONNECTED) break;
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] WiFi Terhubung! (Jalur Utama)");
  } else {
    Serial.println("\n[FAIL] WiFi Timeout. Menyiapkan SIM800L...");
    initSIM800L();
  }
}

void loop() {
  // 1. Selalu baca GPS di setiap loop tanpa interupsi delay
  while (GPSSerial.available() > 0) {
    gps.encode(GPSSerial.read());
  }

  // 2. Kalau WiFi terputus, coba sambung ulang secara berkala (non-blocking)
  tryReconnectWiFi();

  // 3. Timer Pengiriman Data Terjadwal per 30 Detik
  if (millis() - lastSend > interval) {

    // Cek kevalidan koordinat langsung dari internal TinyGPS++
    if (gps.location.isValid() && gps.location.lat() != 0.0 && gps.location.age() < 5000) {
      float currentLat = gps.location.lat();
      float currentLng = gps.location.lng();

      Serial.println("\nMengirim koordinat terbaru...");
      bool ok = kirimData(currentLat, currentLng, activeVehicleId);

      if (ok) {
        // Sekalian coba kosongkan antrian titik lama yang sempat gagal sebelumnya,
        // supaya begitu jaringan kembali, data yang tertunda ikut menyusul.
        flushQueue();
      } else {
        Serial.println("[GAGAL] Tidak ada jaringan / gagal kirim — koordinat disimpan ke antrian offline.");
        enqueuePoint(currentLat, currentLng);
      }
    } else {
      Serial.printf("\n[Menunggu] Satelit belum fix. Jumlah Satelit aktif saat ini: %d\n", gps.satellites.value());
    }

    lastSend = millis();
  }
}

// ── COBA SAMBUNG ULANG WIFI TANPA MEMBLOKIR LOOP UTAMA ────────────────
void tryReconnectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiRetry < wifiRetryInterval) return;

  lastWifiRetry = millis();
  Serial.println("[WiFi] Mencoba sambung ulang...");
  WiFi.begin(ssid, pass); // Non-blocking — hasilnya baru terlihat di status pada loop berikutnya
}

// ── PENGIRIM UTAMA: pilih WiFi kalau tersambung, kalau tidak pakai GSM ──
bool kirimData(float lat, float lng, int vehicleId) {
  if (WiFi.status() == WL_CONNECTED) {
    return kirimDataWiFi(lat, lng, vehicleId);
  }

  if (!gsmInitialized) initSIM800L();
  return kirimDataGSM(lat, lng, vehicleId);
}

// ── TRANSMISI WIFI (HANYA KOORDINAT) ──────────────────────────────────
bool kirimDataWiFi(float lat, float lng, int vehicleId) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String json = "{\"lat\":" + String(lat, 6) +
                ",\"lng\":" + String(lng, 6) +
                ",\"vehicle_id\":" + String(vehicleId) +
                ",\"source\":\"esp32\"}";

  int httpCode = http.POST(json);
  http.end();

  if (httpCode == 200) {
    Serial.println("[BERHASIL] Koordinat masuk ke VPS (via WiFi)");
    return true;
  }

  Serial.printf("[ERROR] WiFi Post Gagal, Code: %d\n", httpCode);
  return false;
}

// ── INITIALISASI GSM ────────────────────────────────
void initSIM800L() {
  GSMSerial.println("AT"); delay(200);
  GSMSerial.println("AT+SAPBR=3,1,\"Contype\",\"GPRS\""); delay(200);
  GSMSerial.println("AT+SAPBR=3,1,\"APN\",\"telkomsel\""); delay(200);
  GSMSerial.println("AT+SAPBR=1,1"); delay(1000);
  gsmInitialized = true;
}

// Baca serial SIM800L sampai ketemu potongan teks tertentu, atau sampai timeout.
// Dipakai supaya kirimDataGSM() benar-benar TAHU apakah kiriman berhasil,
// bukan cuma menebak lewat delay() seperti sebelumnya.
bool waitForGsmResponse(const char* expected, unsigned long timeoutMs) {
  String response = "";
  unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (GSMSerial.available()) {
      char c = GSMSerial.read();
      response += c;
      if (response.indexOf(expected) != -1) {
        return true;
      }
    }
  }
  return false;
}

// ── TRANSMISI INTERNET GSM (sekarang benar-benar mengecek hasilnya) ─────
bool kirimDataGSM(float lat, float lng, int vehicleId) {
  String json = "{\"lat\":" + String(lat, 6) +
                ",\"lng\":" + String(lng, 6) +
                ",\"vehicle_id\":" + String(vehicleId) +
                ",\"source\":\"esp32\"}";

  GSMSerial.println("AT+HTTPINIT"); delay(200);
  GSMSerial.println("AT+HTTPSSL=1"); delay(200);
  GSMSerial.println("AT+HTTPPARA=\"CID\",1"); delay(200);
  GSMSerial.print("AT+HTTPPARA=\"URL\",\""); GSMSerial.print(serverUrl); GSMSerial.println("\""); delay(200);
  GSMSerial.println("AT+HTTPPARA=\"CONTENT\",\"application/json\""); delay(200);

  GSMSerial.print("AT+HTTPDATA="); GSMSerial.print(json.length()); GSMSerial.println(",5000"); delay(200);
  GSMSerial.println(json); delay(200);

  // Eksekusi kirim, lalu TUNGGU balasan asinkron dari modul:
  // "+HTTPACTION: 1,200,<panjang>" artinya method POST (1) sukses (200).
  GSMSerial.println("AT+HTTPACTION=1");
  bool berhasil = waitForGsmResponse("+HTTPACTION: 1,200", 8000);

  GSMSerial.println("AT+HTTPTERM"); delay(100);

  if (berhasil) {
    Serial.println("[BERHASIL] Koordinat masuk ke VPS (via GSM)");
    return true;
  }

  Serial.println("[ERROR] GSM Post gagal atau modul tidak merespons dalam waktu tunggu.");
  return false;
}

// ── ANTRIAN OFFLINE (LittleFS) ───────────────────────────────

// Hitung berapa titik yang sedang tersimpan di antrian
int countQueueLines() {
  if (!LittleFS.exists(QUEUE_FILE)) return 0;
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (!f) return 0;

  int count = 0;
  while (f.available()) {
    if (f.readStringUntil('\n').length() > 0) count++;
  }
  f.close();
  return count;
}

// Buang baris pertama (titik TERTUA) dari file antrian, dipanggil saat
// antrian sudah penuh supaya titik terbaru (lebih relevan) tetap muat.
void dropOldestQueueLine() {
  if (!LittleFS.exists(QUEUE_FILE)) return;

  File src = LittleFS.open(QUEUE_FILE, "r");
  if (!src) return;

  src.readStringUntil('\n'); // lewati baris pertama (dibuang)

  File tmp = LittleFS.open("/queue_tmp.csv", "w");
  while (src.available()) {
    String line = src.readStringUntil('\n');
    if (line.length() > 0) {
      tmp.print(line);
      tmp.print('\n');
    }
  }
  src.close();
  tmp.close();

  LittleFS.remove(QUEUE_FILE);
  LittleFS.rename("/queue_tmp.csv", QUEUE_FILE);
}

// Simpan satu titik yang gagal terkirim ke antrian offline.
void enqueuePoint(float lat, float lng) {
  if (countQueueLines() >= MAX_QUEUE_POINTS) {
    dropOldestQueueLine();
  }

  File f = LittleFS.open(QUEUE_FILE, "a");
  if (!f) {
    Serial.println("[ERROR] Gagal membuka file antrian untuk ditulis.");
    return;
  }
  f.printf("%.6f,%.6f\n", lat, lng);
  f.close();
  Serial.println("[ANTRIAN] Titik disimpan ke penyimpanan offline.");
}

// Coba kirim ulang titik-titik lama yang tersimpan di antrian.
// Dibatasi MAX_FLUSH_PER_CYCLE per pemanggilan supaya tidak memblokir loop
// terlalu lama — pembacaan GPS & jadwal kirim titik terbaru tetap berjalan.
// Kalau ada satu titik yang gagal terkirim ulang (jaringan putus lagi
// di tengah proses), sisa antrian dibiarkan untuk dicoba lagi nanti.
void flushQueue() {
  if (!LittleFS.exists(QUEUE_FILE)) return;

  File src = LittleFS.open(QUEUE_FILE, "r");
  if (!src) return;

  String remaining = "";
  int sentCount = 0;
  bool stopSending = false;

  while (src.available()) {
    String line = src.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (stopSending || sentCount >= MAX_FLUSH_PER_CYCLE) {
      remaining += line + "\n";
      continue;
    }

    int commaIdx = line.indexOf(',');
    if (commaIdx == -1) continue; // baris rusak/tidak valid, lewati saja

    float qLat = line.substring(0, commaIdx).toFloat();
    float qLng = line.substring(commaIdx + 1).toFloat();

    if (kirimData(qLat, qLng, activeVehicleId)) {
      sentCount++;
    } else {
      // Gagal lagi — simpan titik ini dan sisanya untuk percobaan berikutnya
      remaining += line + "\n";
      stopSending = true;
    }
  }
  src.close();

  LittleFS.remove(QUEUE_FILE);
  if (remaining.length() > 0) {
    File out = LittleFS.open(QUEUE_FILE, "w");
    out.print(remaining);
    out.close();
  }

  if (sentCount > 0) {
    Serial.printf("[ANTRIAN] %d titik lama berhasil dikirim ulang.\n", sentCount);
  }
}
