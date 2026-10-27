# ESP32 Firmware

## Status

- Code provided as required.
- NOT TESTED on physical ESP32 in this iteration because no ESP32, DHT22, or LED module is available yet.

## Wiring

| ESP32 Pin | Component |
|-----------|-----------|
| GPIO4 | DHT22 DATA |
| GPIO18 | LED SIGNAL |
| 5V/VIN | DHT22/LED module VCC if module supports it; verify module voltage |
| GND | Common GND |

Use proper voltage level and current limiting for LED module. Do not connect 5V logic directly to 3.3V-only inputs.

## Arduino libraries

- ArduinoJson
- DHT sensor library by Adafruit
- 256dpi/arduino-mqtt

## Build steps

1. Copy `config.example.h` to `config.h`.
2. Fill Wi-Fi and MQTT credentials.
3. Open `smartroom_esp32.ino` in Arduino IDE.
4. Select ESP32 Dev Module.
5. Upload.
