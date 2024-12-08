#include <esp_now.h>
#include <WiFi.h>
#include "protocol.h"

// MAC Address of GCS ESP32
uint8_t gcsAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; // Replace with actual MAC

DroneTelemetry telemetry = {
    .altitude = 0,
    .battery = 100,
    .gpsStatus = 0,
    .currentMode = MODE_STABILIZE,
    .armStatus = 0,
    .satellites = 0
};

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    // Handle send status if needed
}

void OnDataRecv(const uint8_t *mac, const uint8_t *incomingData, int len) {
    if (len == sizeof(DroneMessage)) {
        DroneMessage msg;
        memcpy(&msg, incomingData, sizeof(DroneMessage));
        
        // Verify checksum
        uint8_t checksum = msg.messageType + msg.droneId;
        for (int i = 0; i < 6; i++) {
            checksum += msg.payload[i];
        }
        
        if (checksum != msg.checksum) {
            return; // Invalid message
        }
        
        // Process command
        switch (msg.messageType) {
            case CMD_ARM:
                Serial.println("ARM");
                telemetry.armStatus = 1;
                break;
            case CMD_DISARM:
                Serial.println("DISARM");
                telemetry.armStatus = 0;
                break;
            case CMD_TAKEOFF:
                Serial.println("TAKEOFF");
                break;
            case CMD_LAND:
                Serial.println("LAND");
                break;
            case CMD_POSHOLD:
                Serial.println("POSHOLD");
                break;
            case CMD_MODE_CHANGE:
                Serial.print("MODE ");
                Serial.println(msg.payload[0]);
                telemetry.currentMode = msg.payload[0];
                break;
        }
        
        // Send telemetry back
        esp_now_send(gcsAddress, (uint8_t *)&telemetry, sizeof(DroneTelemetry));
    }
}

void setup() {
    Serial.begin(115200);
    
    WiFi.mode(WIFI_STA);

    if (esp_now_init() != ESP_OK) {
        Serial.println("Error initializing ESP-NOW");
        return;
    }

    esp_now_register_send_cb(OnDataSent);
    esp_now_register_recv_cb(OnDataRecv);
    
    // Add peer
    esp_now_peer_info_t peerInfo;
    memcpy(peerInfo.peer_addr, gcsAddress, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    
    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
        Serial.println("Failed to add peer");
        return;
    }
}

void loop() {
    // Update telemetry values (in real implementation, these would come from sensors)
    telemetry.altitude += 0.1;
    if (telemetry.altitude > 10) telemetry.altitude = 0;
    
    telemetry.battery -= 0.01;
    if (telemetry.battery < 0) telemetry.battery = 100;
    
    // Send telemetry every second
    static unsigned long lastTelemetry = 0;
    if (millis() - lastTelemetry > 1000) {
        esp_now_send(gcsAddress, (uint8_t *)&telemetry, sizeof(DroneTelemetry));
        lastTelemetry = millis();
    }
} 