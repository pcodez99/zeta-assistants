#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Adafruit_BME280.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>
#include <time.h>
#include "secrets.h"
#include "root_ca.h"

const char* REPORT_URL = "https://assistant.zetalinks.it/api/weather/report";
const unsigned long REPORT_INTERVAL = 60000;
Adafruit_BME280 bme;
Adafruit_SSD1306 display(128, 64, &Wire, -1, 100000, 100000);
float temperature = NAN, humidity = NAN, pressure = NAN;
unsigned long lastRead = 0, lastAttempt = 0, lastReconnect = 0;
unsigned long retryInterval = 0;
bool firstReport = true;
int lastHttpCode = 0;

bool validReading() {
  return isfinite(temperature) && isfinite(humidity) && isfinite(pressure);
}

void drawDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  if (WiFi.status() != WL_CONNECTED) display.print("WiFi: connessione...");
  else if (time(nullptr) < 1700000000) display.print("Sincronizzo orologio");
  else if (lastHttpCode >= 200 && lastHttpCode < 300) display.print("Server: invio OK");
  else if (lastHttpCode != 0) {
    display.print("Errore invio: "); display.print(lastHttpCode);
  } else display.print("Server: attesa invio");
  display.drawLine(0, 11, 127, 11, SSD1306_WHITE);
  if (validReading()) {
    display.setCursor(0, 18);
    display.print("Temp:  "); display.print(temperature, 1); display.print(" C");
    display.setCursor(0, 34);
    display.print("Umid:  "); display.print(humidity, 1); display.print(" %");
    display.setCursor(0, 50);
    display.print("Press: "); display.print(pressure, 1); display.print(" hPa");
  } else {
    display.setCursor(0, 24); display.print("Errore sensore");
  }
  display.display();
}

void sendReport() {
  WiFiClientSecure client;
  client.setCACert(ROOT_CA);
  client.setHandshakeTimeout(10);
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  if (!http.begin(client, REPORT_URL)) {
    lastHttpCode = -1;
    Serial.println("Impossibile inizializzare HTTPS");
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", WEATHER_API_KEY);
  char payload[160];
  snprintf(payload, sizeof(payload),
    "{\"temperature\":%.2f,\"humidity\":%.2f,\"pressure\":%.2f}",
    temperature, humidity, pressure);
  lastHttpCode = http.POST(String(payload));
  Serial.printf("Invio al server: HTTP %d\n", lastHttpCode);
  if (lastHttpCode >= 200 && lastHttpCode < 300) {
    Serial.println("Misure salvate nella dashboard");
  } else if (lastHttpCode > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println(http.errorToString(lastHttpCode));
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  Wire.setClock(100000);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Errore OLED");
    while (true) delay(1000);
  }
  if (!bme.begin(0x76, &Wire)) {
    Serial.println("BME280 non trovato a 0x76");
    drawDisplay();
    while (true) delay(1000);
  }
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // Accurate time is required to validate the HTTPS certificate.
  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
  Serial.println("Connessione WiFi; sincronizzazione orologio per HTTPS...");
}

void loop() {
  unsigned long now = millis();
  if (lastRead == 0 || now - lastRead >= 2000) {
    lastRead = now;
    temperature = bme.readTemperature();
    humidity = bme.readHumidity();
    pressure = bme.readPressure() / 100.0F;
    Serial.printf("T: %.1f C | U: %.1f %% | P: %.1f hPa | WiFi: %s\n",
      temperature, humidity, pressure,
      WiFi.status() == WL_CONNECTED ? "OK" : "disconnesso");
    drawDisplay();
  }
  if (WiFi.status() != WL_CONNECTED && now - lastReconnect >= 15000) {
    lastReconnect = now;
    WiFi.reconnect();
  }
  if (WiFi.status() == WL_CONNECTED && time(nullptr) >= 1700000000 && validReading()
      && (firstReport || now - lastAttempt >= retryInterval)) {
    firstReport = false;
    sendReport();
    lastAttempt = millis();
    retryInterval = lastHttpCode >= 200 && lastHttpCode < 300 ? REPORT_INTERVAL : 15000;
    drawDisplay();
  }
  delay(10);
}
