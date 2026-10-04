# ESP32 WROOM-32 + BME280 + SSD1306

Open `esp32_station.ino` in Arduino IDE and select ESP32 Dev Module.
Install Adafruit BME280 Library, Adafruit SSD1306 and Adafruit GFX Library,
including their dependencies. No ArduinoJson dependency is needed.

Copy `secrets.example.h` to `secrets.h` if the latter does not exist. Fill in the
Wi-Fi SSID and password (2.4 GHz), plus the server WEATHER_API_KEY. The local
prepared secrets.h already contains the server key; change only Wi-Fi settings.
Never commit secrets.h.

Wiring: SDA GPIO21, SCL GPIO22, BME280 0x76, SSD1306 0x3C. Use the already
verified 3.3 V wiring. The OLED updates every two seconds except during a bounded
network request. It keeps showing local measurements when Wi-Fi is unavailable.

The firmware synchronizes time with NTP, validates HTTPS using ISRG Root X1,
and POSTs temperature, humidity and pressure to
https://assistant.zetalinks.it/api/weather/report. The first upload happens once
Wi-Fi and time are ready, followed by one upload per minute. Failed uploads are
retried after 15 seconds; offline readings are not buffered.

At 115200 baud, success is `Invio al server: HTTP 201` and
`Misure salvate nella dashboard`. A 401 means the API key does not match.
If the OLED stays on `Sincronizzo orologio`, check that the Wi-Fi permits NTP.
The dashboard polls every ten seconds, so allow that delay after a successful
upload. Only the latest successful upload is indicated by `Server: invio OK`.

Root certificate source: https://letsencrypt.org/certs/isrgrootx1.pem
