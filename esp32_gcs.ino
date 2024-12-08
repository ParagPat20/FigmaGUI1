#include <esp_now.h>
#include <WiFi.h>
#include "protocol.h"

// MAC Address of drone ESP32
uint8_t droneAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; // Replace with actual MAC

// Callback when data is sent
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    Serial.print("Last Packet Send Status: ");
    Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

// Callback when data is received
void OnDataRecv(const uint8_t *mac, const uint8_t *incomingData, int len) {
    if (len == sizeof(DroneTelemetry)) {
        DroneTelemetry telemetry;
        memcpy(&telemetry, incomingData, sizeof(DroneTelemetry));
        
        // Send telemetry to PC via Serial
        Serial.print("T,"); // Telemetry identifier
        Serial.print(telemetry.altitude); Serial.print(",");
        Serial.print(telemetry.battery); Serial.print(",");
        Serial.print(telemetry.gpsStatus); Serial.print(",");
        Serial.print(telemetry.currentMode); Serial.print(",");
        Serial.print(telemetry.armStatus); Serial.print(",");
        Serial.println(telemetry.satellites);
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
    memcpy(peerInfo.peer_addr, droneAddress, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    
    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
        Serial.println("Failed to add peer");
        return;
    }
}

void sendCommand(CommandType cmd, uint8_t *payload = nullptr) {
    DroneMessage msg;
    msg.messageType = cmd;
    msg.droneId = 0x01; // Default drone ID
    
    if (payload) {
        memcpy(msg.payload, payload, 6);
    }
    
    // Calculate checksum
    msg.checksum = msg.messageType + msg.droneId;
    for (int i = 0; i < 6; i++) {
        msg.checksum += msg.payload[i];
    }
    
    esp_err_t result = esp_now_send(droneAddress, (uint8_t *)&msg, sizeof(DroneMessage));
}

void loop() {
    if (Serial.available()) {
        String cmd = Serial.readStringUntil('\n');
        
        if (cmd == "ARM") {
            sendCommand(CMD_ARM);
        }
        else if (cmd == "DISARM") {
            sendCommand(CMD_DISARM);
        }
        else if (cmd == "TAKEOFF") {
            sendCommand(CMD_TAKEOFF);
        }
        else if (cmd == "LAND") {
            sendCommand(CMD_LAND);
        }
        else if (cmd == "POSHOLD") {
            sendCommand(CMD_POSHOLD);
        }
        else if (cmd.startsWith("MODE")) {
            uint8_t mode = cmd.substring(5).toInt();
            uint8_t payload[6] = {mode};
            sendCommand(CMD_MODE_CHANGE, payload);
        }
    }
} 