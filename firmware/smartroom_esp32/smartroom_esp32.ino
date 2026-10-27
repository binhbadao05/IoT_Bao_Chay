// STATUS: NOT TESTED on physical hardware because ESP32/DHT22/LED are not available in this iteration.

#include <ArduinoJson.h>
#include <DHT.h>
#include <WiFi.h>
#include <arduino-mqtt.h>

// Copy config.example.h to config.h and fill real values.
#include "config.h"

#define DHTPIN 4
#define DHTTYPE DHT22
#define LED_PIN 18

DHT dht(DHTPIN, DHTTYPE);
WiFiClient wifiClient;
MQTTClient mqttClient;
unsigned long lastTelemetryMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long messageSeq = 0;
bool ledState = false;
String lastCommandId = "";

void connectWifi() {
  Serial.println("Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("WiFi connected: ");
  Serial.println(WiFi.localIP());
}

bool connectMqtt() {
  Serial.println("Connecting MQTT");
  if (!mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    return false;
  }
  mqttClient.subscribe(String(MQTT_PREFIX) + DEVICE_ID + "/commands");
  mqttClient.subscribe(String(MQTT_PREFIX) + DEVICE_ID + "/config");
  publishStatus("online");
  return true;
}

void publishStatus(const char* state) {
  StaticJsonDocument<256> doc;
  doc["schema_version"] = 1;
  doc["message_id"] = buildMessageId("status");
  doc["device_id"] = DEVICE_ID;
  doc["state"] = state;
  publishJson("status", doc);
}

void publishHeartbeat() {
  StaticJsonDocument<256> doc;
  doc["schema_version"] = 1;
  doc["message_id"] = buildMessageId("heartbeat");
  doc["device_id"] = DEVICE_ID;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["telemetry_interval_seconds"] = TELEMETRY_INTERVAL_SECONDS;
  doc["heartbeat_interval_seconds"] = HEARTBEAT_INTERVAL_SECONDS;
  publishJson("heartbeat", doc);
}

void publishTelemetry() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity) || temperature < -40 || temperature > 85 || humidity < 0 || humidity > 100) {
    Serial.println("DHT reading invalid; skip publish");
    return;
  }
  StaticJsonDocument<256> doc;
  doc["schema_version"] = 1;
  doc["message_id"] = buildMessageId("telemetry");
  doc["device_id"] = DEVICE_ID;
  doc["temperature_c"] = temperature;
  doc["humidity_percent"] = humidity;
  publishJson("telemetry", doc);
}

String buildMessageId(const char* type) {
  messageSeq++;
  return String(DEVICE_ID) + "-" + type + "-" + String(millis()) + "-" + String(messageSeq);
}

void publishJson(const char* kind, JsonDocument& doc) {
  String topic = String(MQTT_PREFIX) + DEVICE_ID + "/" + kind;
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish(topic, payload, false, 1);
}

void setLed(bool value) {
  ledState = value;
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  Serial.print("Led state: ");
  Serial.println(ledState ? "ON" : "OFF");
}

void handleCommandPayload(const String& payload) {
  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, payload);
  if (err || doc["command_id"].isNull()) {
    Serial.println("Invalid command JSON");
    return;
  }
  String commandId = doc["command_id"].as<String>();
  if (commandId == lastCommandId) {
    return;
  }
  lastCommandId = commandId;
  String commandType = doc["command_type"] | "";
  if (commandType == "LED_CONTROL") {
    String action = doc["payload"]["action"] | "OFF";
    setLed(action == "ON");
    sendAck(commandId, "ACKNOWLEDGED", ledState);
  }
}

void sendAck(const String& commandId, const char* result, bool ledOn) {
  StaticJsonDocument<256> doc;
  doc["schema_version"] = 1;
  doc["command_id"] = commandId;
  doc["device_id"] = DEVICE_ID;
  doc["result"] = result;
  JsonObject state = doc.createNestedObject("state");
  state["led_on"] = ledOn;
  publishJson("commands/ack", doc);
}

void onMessage(String& topic, String& payload) {
  if (topic.endsWith("/commands")) {
    handleCommandPayload(payload);
  } else if (topic.endsWith("/config")) {
    // Firmware contract accepts config commands; thresholds are applied server-side in P0.
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, payload) || doc["command_id"].isNull()) return;
    doc["schema_version"] = 1;
    doc["device_id"] = DEVICE_ID;
    doc["result"] = "ACKNOWLEDGED";
    publishJson("config/ack", doc);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  dht.begin();
  connectWifi();
}

void loop() {
  mqttClient.loop();
  if (!mqttClient.connected()) {
    delay(2000);
    if (!connectMqtt()) {
      return;
    }
    mqttClient.onMessage(onMessage);
    mqttClient.setWill(
      String(MQTT_PREFIX) + DEVICE_ID + "/status",
      String("{\"schema_version\":1,\"message_id\":\"lwt\",\"device_id\":\"" + String(DEVICE_ID) + "\",\"state\":\"offline\"}"),
      false, 1);
  }
  unsigned long now = millis();
  if (now - lastTelemetryMs >= (unsigned long)TELEMETRY_INTERVAL_SECONDS * 1000UL) {
    lastTelemetryMs = now;
    publishTelemetry();
  }
  if (now - lastHeartbeatMs >= (unsigned long)HEARTBEAT_INTERVAL_SECONDS * 1000UL) {
    lastHeartbeatMs = now;
    publishHeartbeat();
  }
  delay(50);
}
