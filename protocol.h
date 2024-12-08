#ifndef PROTOCOL_H
#define PROTOCOL_H

// Command Types
enum CommandType {
    CMD_ARM = 0x01,
    CMD_DISARM = 0x02,
    CMD_TAKEOFF = 0x03,
    CMD_LAND = 0x04,
    CMD_POSHOLD = 0x05,
    CMD_MODE_CHANGE = 0x06,
    CMD_HEARTBEAT = 0x07,
    CMD_TELEMETRY_REQUEST = 0x08
};

// Mode Types
enum FlightMode {
    MODE_STABILIZE = 0x01,
    MODE_ALTHOLD = 0x02,
    MODE_LOITER = 0x03,
    MODE_RTL = 0x04,
    MODE_AUTO = 0x05
};

// Message Structure
struct DroneMessage {
    uint8_t messageType;      // Command type
    uint8_t droneId;         // For future mesh network support
    uint8_t payload[6];      // Flexible payload
    uint8_t checksum;        // Simple checksum for validation
} __attribute__((packed));

// Telemetry Structure
struct DroneTelemetry {
    float altitude;          // Current altitude in meters
    float battery;           // Battery percentage
    uint8_t gpsStatus;      // GPS fix status
    uint8_t currentMode;    // Current flight mode
    uint8_t armStatus;      // Armed/Disarmed status
    uint8_t satellites;     // Number of GPS satellites
} __attribute__((packed));

#endif 