/**
 * Stazione Meteorologica ESP32 con BME280
 * 
 * Questo sketch legge i dati di temperatura, umidità e pressione dal sensore BME280.
 * 1. Espone un'API locale su porta 80 all'endpoint GET /data con header CORS abilitati,
 *    consentendo al frontend di interrogarlo direttamente via browser.
 * 2. Invia periodicamente un report POST in formato JSON al backend NestJS per salvare
 *    lo storico delle letture nel database PostgreSQL.
 * 
 * Librerie necessarie (da installare tramite Arduino Library Manager):
 * - Adafruit BME280 Library
 * - Adafruit Unified Sensor
 * - ArduinoJson (v6 o v7)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIGURAZIONE UTENTE
// ============================================================================

// Credenziali Wi-Fi locali
const char* ssid = "IL_TUO_SSID_WIFI";
const char* password = "LA_TUA_PASSWORD_WIFI";

// Configurazione Backend NestJS
// Sostituisci "192.168.1.XX" con l'IP locale del computer che esegue il backend
const char* backendUrl = "http://192.168.1.XX:3000/api/weather/report";
const char* apiKey = "super-secret-esp32-api-key";

// Intervallo di invio report storici al backend (in millisecondi)
// Es. 300000 ms = 5 minuti
const unsigned long reportInterval = 300000; 

// ============================================================================
// STATO GLOBALE
// ============================================================================

Adafruit_BME280 bme;
WebServer server(80);
unsigned long lastReportTime = 0;

// ============================================================================
// GESTIONE CORS E ENDPOINT WEB SERVER
// ============================================================================

// Imposta gli header CORS per consentire le richieste dal browser
void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
}

// Gestisce le richieste preflight OPTIONS inviate dai browser moderni
void handleOptions() {
  setCorsHeaders();
  server.send(204); // No Content
}

// Endpoint GET /data - Ritorna le letture istantanee in JSON
void handleGetData() {
  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F; // Converte in hPa

  // Verifica che i dati letti siano validi
  if (isnan(temperature) || isnan(humidity) || isnan(pressure)) {
    setCorsHeaders();
    server.send(500, "application/json", "{\"error\":\"Lettura sensore fallita\"}");
    Serial.println("Errore: Impossibile leggere dal sensore BME280!");
    return;
  }

  // Costruisce la risposta JSON
  // Compatibile sia con ArduinoJson v6 che v7
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<256> doc;
#endif

  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pressure"] = pressure;

  String jsonResponse;
  serializeJson(doc, jsonResponse);

  setCorsHeaders();
  server.send(200, "application/json", jsonResponse);
}

// Gestione delle rotte non trovate
void handleNotFound() {
  setCorsHeaders();
  server.send(404, "application/json", "{\"error\":\"Rotta non trovata\"}");
}

// ============================================================================
// CONNESSIONE WI-FI E REPORT BACKEND
// ============================================================================

void connectToWiFi() {
  Serial.print("Connessione a Wi-Fi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(1000);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("Wi-Fi connesso!");
    Serial.print("Indirizzo IP locale dell'ESP32: ");
    Serial.println(WiFi.localIP());
    Serial.println("Usa questo indirizzo nelle impostazioni del frontend.");
  } else {
    Serial.println("");
    Serial.println("Impossibile connettersi al Wi-Fi. Il server locale non sarà raggiungibile.");
  }
}

void sendReportToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnesso. Salto l'invio del report storico.");
    return;
  }

  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;

  if (isnan(temperature) || isnan(humidity) || isnan(pressure)) {
    Serial.println("Letture del sensore non valide. Report storico annullato.");
    return;
  }

  HTTPClient http;
  http.begin(backendUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<256> doc;
#endif

  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pressure"] = pressure;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.print("Invio dati storici al backend: ");
  Serial.println(jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Risposta backend (HTTP ");
    Serial.print(httpResponseCode);
    Serial.println("): " + response);
  } else {
    Serial.print("Errore nella richiesta POST: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ============================================================================
// SETUP & LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- Avvio Stazione Meteo ESP32 ---");

  // Inizializza il sensore BME280 su I2C (indirizzo standard 0x76 o 0x77)
  bool status = bme.begin(0x76);
  if (!status) {
    Serial.println("Sensore BME280 non trovato all'indirizzo 0x76. Tento 0x77...");
    status = bme.begin(0x77);
  }
  
  if (!status) {
    Serial.println("ERRORE: Sensore BME280 non trovato! Controlla i collegamenti I2C (SDA/SCL).");
    // Rimane in loop bloccante se il sensore non è disponibile
    while (1) {
      delay(1000);
    }
  }
  Serial.println("Sensore BME280 configurato con successo.");

  // Connessione Wi-Fi
  connectToWiFi();

  // Configura rotte HTTP del server locale
  server.on("/data", HTTP_GET, handleGetData);
  server.on("/data", HTTP_OPTIONS, handleOptions);
  server.onNotFound(handleNotFound);

  // Avvia il server
  server.begin();
  Serial.println("Web Server locale avviato sulla porta 80.");

  // Invia il primo report al backend all'avvio
  sendReportToBackend();
  lastReportTime = millis();
}

void loop() {
  // Gestisce le connessioni client per l'API locale
  server.handleClient();

  // Verifica se è il momento di inviare un report periodico al backend
  unsigned long currentTime = millis();
  if (currentTime - lastReportTime >= reportInterval) {
    sendReportToBackend();
    lastReportTime = currentTime;
  }
}
