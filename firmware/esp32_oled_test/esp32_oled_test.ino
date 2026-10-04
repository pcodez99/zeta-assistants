#include <Wire.h>
#include <Adafruit_BME280.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>

Adafruit_BME280 bme;
Adafruit_SSD1306 display(128, 64, &Wire, -1, 100000, 100000);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  Wire.setClock(100000);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Errore inizializzazione OLED");
    while (true) delay(1000);
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Avvio BME280...");
  display.display();

  if (!bme.begin(0x76, &Wire)) {
    Serial.println("BME280 non trovato");
    display.println("Sensore non trovato");
    display.display();
    while (true) delay(1000);
  }
}

void loop() {
  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("STAZIONE METEO");
  display.drawLine(0, 11, 127, 11, SSD1306_WHITE);

  if (!isfinite(temperature) || !isfinite(humidity) || !isfinite(pressure)) {
    display.setCursor(0, 24);
    display.println("Errore lettura");
    Serial.println("Lettura sensore non valida");
  } else {
    display.setCursor(0, 18);
    display.print("Temp:  "); display.print(temperature, 1); display.println(" C");
    display.setCursor(0, 34);
    display.print("Umid:  "); display.print(humidity, 1); display.println(" %");
    display.setCursor(0, 50);
    display.print("Press: "); display.print(pressure, 1); display.println(" hPa");
    Serial.printf("T: %.1f C | U: %.1f %% | P: %.1f hPa\n", temperature, humidity, pressure);
  }

  display.display();
  delay(2000);
}
