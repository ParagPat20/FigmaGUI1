// DOM Elements
let elements = {};

// Initialize elements after DOM is loaded
function initializeElements() {
    elements = {
        // Drone Control Buttons
        droneNameBtn: document.querySelector('.drone-name'),
        armBtn: document.querySelector('.arm'),
        launchBtn: document.querySelector('.launch'),
        landBtn: document.querySelector('.land'),
        posholdBtn: document.querySelector('.poshold'),
        modesBtn: document.querySelector('.modes'),
        addDroneBtn: document.querySelector('.add-drone'),
        
        // Top Bar Controls
        leaderPosCoords: document.querySelector('.coordinates'),
        separationInput: document.querySelector('.measurement input'),
        operatingAltInput: document.querySelector('.measurement-12 input'),
        programSelect: document.querySelector('.program-select'),
        startBtn: document.querySelector('.start'),
        pauseBtn: document.querySelector('.pause'),
        
        // Sidebar Menu Items
        menuItems: document.querySelectorAll('.menu-item'),
        
        // Drone Selection
        droneMcuBtn: document.querySelector('.button-drone-mcu')
    };
}

// Drone State Management
class DroneState {
    constructor() {
        this.isArmed = false;
        this.isFlying = false;
        this.isPosHold = false;
        this.currentAltitude = 0;
        this.currentMode = 'IDLE';
        this.batteryLevel = 100;
        this.gpsStatus = 'Fixed';
        this.satellites = 0;
    }
}

let currentDrone = new DroneState();

// Button Event Handlers
function initializeEventListeners() {
    // Add null checks before adding event listeners
    
    // Drone Control Buttons
    elements.armBtn?.addEventListener('click', handleArm);
    elements.launchBtn?.addEventListener('click', handleLaunch);
    elements.landBtn?.addEventListener('click', handleLand);
    elements.posholdBtn?.addEventListener('click', handlePosHold);
    elements.modesBtn?.addEventListener('click', handleModes);
    elements.addDroneBtn?.addEventListener('click', handleAddDrone);
    
    // Top Bar Controls
    elements.separationInput?.addEventListener('change', handleSeparationChange);
    elements.operatingAltInput?.addEventListener('change', handleAltitudeChange);
    elements.programSelect?.addEventListener('change', handleProgramChange);
    elements.startBtn?.addEventListener('click', handleStart);
    elements.pauseBtn?.addEventListener('click', handlePause);
    
    // Sidebar Menu
    elements.menuItems?.forEach(item => {
        item?.addEventListener('click', handleMenuClick);
    });
    
    // Drone Selection
    elements.droneMcuBtn?.addEventListener('click', handleDroneSelect);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initializeEventListeners();
    initializeModeOptions();
    initializeMap();
});

// Drone Control Functions
function handleArm() {
    currentDrone.isArmed = !currentDrone.isArmed;
    const armButton = elements.armBtn;
    const armLabel = armButton.querySelector('.label');
    
    if (currentDrone.isArmed) {
        armButton.style.background = '#f05151';
        armLabel.textContent = 'DISARM';
    } else {
        armButton.style.background = '#70c172';
        armLabel.textContent = 'ARM';
    }
    
    updateDroneStatus();
}

function handleLaunch() {
    if (!currentDrone.isArmed) {
        showAlert('Drone must be armed first');
        return;
    }
    currentDrone.isFlying = true;
    
    // Update Launch button
    const launchButton = elements.launchBtn;
    launchButton.style.background = '#70c172';
    launchButton.disabled = true;
    
    // Update Land button
    const landButton = elements.landBtn;
    landButton.style.background = '#f2d2f2';
    landButton.disabled = false;
    
    updateDroneStatus();
}

function handleLand() {
    if (!currentDrone.isFlying) return;
    currentDrone.isFlying = false;
    
    // Update Land button
    const landButton = elements.landBtn;
    landButton.style.background = '#f05151';
    landButton.disabled = true;
    
    // Reset Launch button
    const launchButton = elements.launchBtn;
    launchButton.style.background = '#f2f2f2';
    launchButton.disabled = false;
    
    updateDroneStatus();
}

function handlePosHold() {
    if (!currentDrone.isFlying) return;
    currentDrone.isPosHold = !currentDrone.isPosHold;
    elements.posholdBtn.style.background = currentDrone.isPosHold ? '#f05151' : '#2c7bf2';
    updateDroneStatus();
}

function handleModes() {
    const modesDropdown = document.querySelector('.modes-dropdown');
    const modesButton = elements.modesBtn;
    
    // Toggle dropdown visibility
    const isHidden = modesDropdown.style.display === 'none' || !modesDropdown.style.display;
    
    if (isHidden) {
        // Get button position relative to viewport
        const buttonRect = modesButton.getBoundingClientRect();
        
        // Position dropdown below the button
        modesDropdown.style.top = `${buttonRect.bottom + 5}px`;
        modesDropdown.style.left = `${buttonRect.left}px`;
        
        // Show dropdown
        modesDropdown.style.display = 'block';
        modesButton.style.background = '#2c7bf2';
        
        // Clear previous active states
        document.querySelectorAll('.mode-option').forEach(opt => opt.classList.remove('active'));
        
        // Highlight current mode
        const currentModeOption = modesDropdown.querySelector(`[data-mode="${currentDrone.currentMode}"]`);
        if (currentModeOption) {
            currentModeOption.classList.add('active');
        }
    } else {
        // Hide dropdown
        modesDropdown.style.display = 'none';
        modesButton.style.background = '#ffab49';
    }
}

function handleAddDrone() {
    // Implementation for adding new drone
    showAlert('Add Drone functionality to be implemented');
}

// Top Bar Control Functions
function handleSeparationChange(e) {
    const value = parseFloat(e.target.value);
    if (value < 0 || value > 99) {
        e.target.value = value < 0 ? 0 : 99;
    }
    updateFormation();
}

function handleAltitudeChange(e) {
    const value = parseFloat(e.target.value);
    if (value < 0 || value > 99) {
        e.target.value = value < 0 ? 0 : 99;
    }
    updateFormation();
}

function handleProgramChange(e) {
    const program = e.target.value;
    updateFormation();
}

function handleStart() {
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    startMission();
}

function handlePause() {
    elements.pauseBtn.disabled = true;
    elements.startBtn.disabled = false;
    pauseMission();
}

// Sidebar Menu Functions
function handleMenuClick(e) {
    const menuItem = e.currentTarget;
    elements.menuItems.forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');
    
    const menuId = menuItem.id;
    switch(menuId) {
        case 'menu-home':
            showHomeView();
            break;
        case 'menu-drone-settings':
            showDroneSettings();
            break;
        case 'menu-missions':
            showMissions();
            break;
        case 'menu-logbook':
            showLogbook();
            break;
        case 'menu-settings':
            showSettings();
            break;
        case 'menu-help':
            showHelp();
            break;
    }
}

// Drone Selection Function
function handleDroneSelect() {
    // Implementation for selecting different drones
    showAlert('Drone selection to be implemented');
}

// Utility Functions
function updateDroneStatus() {
    // Update UI elements with current drone state
    document.querySelector('.altitude').textContent = `Altitude: ${currentDrone.currentAltitude}m`;
    document.querySelector('.mode').textContent = `Mode: ${currentDrone.currentMode}`;
    document.querySelector('.battery').textContent = `Battery: ${currentDrone.batteryLevel}%`;
}

function updateFormation() {
    // Implementation for updating drone formation
}

function startMission() {
    // Implementation for starting mission
}

function pauseMission() {
    // Implementation for pausing mission
}

function showAlert(message) {
    // Implementation for showing alerts
    console.log(message);
}

// View Management Functions
function showHomeView() {
    // Implementation for home view
}

function showDroneSettings() {
    // Implementation for drone settings view
}

function showMissions() {
    // Implementation for missions view
}

function showLogbook() {
    // Implementation for logbook view
}

function showSettings() {
    // Implementation for settings view
}

function showHelp() {
    // Implementation for help view
}

// Map Management (if using Leaflet)
let map = null;
let droneMarkers = new Map();

function initializeMap() {
    if (!map) {
        map = L.map('map', {
            center: [0, 0],
            zoom: 2,
            zoomControl: true,
            attributionControl: false
        });

        // Light mode tiles
        const lightMode = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            minZoom: 2
        });

        // Satellite mode tiles
        const satelliteMode = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            minZoom: 2
        });

        // Add custom control for layer switching
        const layerControl = L.control({position: 'topright'});
        
        layerControl.onAdd = function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-type-control');
            
            // Add light mode button
            const lightButton = L.DomUtil.create('a', 'map-type-button light-mode active', container);
            lightButton.innerHTML = 'Map';
            lightButton.href = '#';
            
            // Add satellite mode button
            const satelliteButton = L.DomUtil.create('a', 'map-type-button satellite-mode', container);
            satelliteButton.innerHTML = 'Satellite';
            satelliteButton.href = '#';
            
            // Add click handlers
            L.DomEvent.on(lightButton, 'click', function(e) {
                L.DomEvent.preventDefault(e);
                map.removeLayer(satelliteMode);
                map.addLayer(lightMode);
                lightButton.classList.add('active');
                satelliteButton.classList.remove('active');
            });
            
            L.DomEvent.on(satelliteButton, 'click', function(e) {
                L.DomEvent.preventDefault(e);
                map.removeLayer(lightMode);
                map.addLayer(satelliteMode);
                satelliteButton.classList.add('active');
                lightButton.classList.remove('active');
            });
            
            return container;
        };

        // Add the control to map
        layerControl.addTo(map);
        
        // Set default layer
        lightMode.addTo(map);
    }
}

function updateDroneMarker(droneId, position) {
    const droneIcon = L.divIcon({
        className: 'drone-marker',
        html: `<div style="
            width: 12px;
            height: 12px;
            background: #70c172;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(112, 193, 114, 0.5);
        "></div>`,
        iconSize: [12, 12]
    });

    if (!droneMarkers.has(droneId)) {
        droneMarkers.set(droneId, L.marker(position, { icon: droneIcon }).addTo(map));
    } else {
        droneMarkers.get(droneId).setLatLng(position);
    }
}

// Add event listeners for mode options
function initializeModeOptions() {
    const modeOptions = document.querySelectorAll('.mode-option');
    const modesDropdown = document.querySelector('.modes-dropdown');
    
    // Ensure dropdown starts hidden
    modesDropdown.style.display = 'none';
    
    modeOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const selectedMode = e.target.dataset.mode;
            currentDrone.currentMode = selectedMode;
            
            // Update UI
            document.querySelectorAll('.mode-option').forEach(opt => opt.classList.remove('active'));
            e.target.classList.add('active');
            
            // Hide dropdown and reset button color
            modesDropdown.style.display = 'none';
            elements.modesBtn.style.background = '#ffab49';
            
            updateDroneStatus();
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.modes') && !e.target.closest('.modes-dropdown')) {
            modesDropdown.style.display = 'none';
            elements.modesBtn.style.background = '#ffab49';
        }
    });
}

class SerialConnection {
    constructor() {
        this.isConnected = false;
        this.currentPort = null;
        this.setupPortSelector();
    }

    async updatePortList() {
        try {
            const response = await fetch('http://127.0.0.1:5000/list_ports');
            if (!response.ok) throw new Error('Failed to fetch ports');
            const ports = await response.json();
            
            const portSelect = document.querySelector('.port-select');
            if (!portSelect) return;

            const currentValue = portSelect.value;
            portSelect.innerHTML = '<option value="" disabled selected>Select Port</option>';
            
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.port;
                option.textContent = port.description || port.port;
                if (port.port === currentValue) {
                    option.selected = true;
                }
                portSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to get ports:', error);
        }
    }

    setupPortSelector() {
        const portSelect = document.querySelector('.port-select');
        if (!portSelect) return;

        // Update ports list when dropdown is clicked
        portSelect.addEventListener('mousedown', () => {
            this.updatePortList();
        });
        
        // Handle selection
        portSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.connectToPort(e.target.value);
            }
        });
    }

    async connectToPort(port) {
        try {
            const response = await fetch('http://127.0.0.1:5000/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    port: port,
                    baudrate: 115200
                })
            });
            
            if (!response.ok) {
                throw new Error(await response.text());
            }

            const result = await response.json();
            this.updateConnectionStatus(result.status === "connected");
            
            if (result.status === "connected") {
                this.isConnected = true;
                this.currentPort = port;
                console.log('Connected to', port);
            }
        } catch (error) {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
            this.isConnected = false;
        }
    }

    updateConnectionStatus(isConnected) {
        const espNowText = document.querySelector('.esp-now');
        const portText = document.querySelector('.port');
        
        if (!espNowText || !portText) return;

        const color = isConnected ? '#70C172' : '#F05151';
        espNowText.style.color = color;
        portText.style.color = color;
    }

    async sendCommand(command) {
        if (!this.isConnected) {
            console.error('Not connected to any port');
            return null;
        }

        try {
            const response = await fetch('http://127.0.0.1:5000/send_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command })
            });
            
            if (!response.ok) {
                throw new Error(await response.text());
            }

            const result = await response.json();
            console.log(`Command sent: ${command}, Response:`, result);
            return result;
        } catch (error) {
            console.error('Command error:', error);
            return null;
        }
    }

    // Drone-specific commands
    async arm() {
        return await this.sendCommand('ARM');
    }

    async disarm() {
        return await this.sendCommand('DISARM');
    }

    async launch() {
        return await this.sendCommand('LAUNCH');
    }

    async land() {
        return await this.sendCommand('LAND');
    }

    async setMode(mode) {
        return await this.sendCommand(`MODE ${mode}`);
    }

    async setPosHold(enabled) {
        return await this.sendCommand(enabled ? 'POSHOLD_ON' : 'POSHOLD_OFF');
    }

    async setAltitude(altitude) {
        return await this.sendCommand(`ALT ${altitude}`);
    }
}

// Initialize serial connection when page loads
document.addEventListener('DOMContentLoaded', () => {
    const serialConnection = new SerialConnection();

    // Arm/Disarm button
    const armBtn = document.querySelector('.arm');
    if (armBtn) {
        armBtn.addEventListener('click', async () => {
            if (currentDrone.isArmed) {
                await serialConnection.disarm();
            } else {
                await serialConnection.arm();
            }
        });
    }

    // Launch button
    const launchBtn = document.querySelector('.launch');
    if (launchBtn) {
        launchBtn.addEventListener('click', async () => {
            if (!currentDrone.isArmed) {
                showAlert('Drone must be armed first');
                return;
            }
            await serialConnection.launch();
        });
    }

    // Land button
    const landBtn = document.querySelector('.land');
    if (landBtn) {
        landBtn.addEventListener('click', async () => {
            await serialConnection.land();
        });
    }

    // PosHold button
    const posholdBtn = document.querySelector('.poshold');
    if (posholdBtn) {
        posholdBtn.addEventListener('click', async () => {
            await serialConnection.setPosHold(!currentDrone.isPosHold);
        });
    }

    // Mode selection
    const modeOptions = document.querySelectorAll('.mode-option');
    modeOptions.forEach(option => {
        option.addEventListener('click', async (e) => {
            const mode = e.target.dataset.mode;
            await serialConnection.setMode(mode);
        });
    });

    // Altitude input
    const altInput = document.querySelector('.measurement-12 input');
    if (altInput) {
        altInput.addEventListener('change', async (e) => {
            const altitude = parseFloat(e.target.value);
            if (!isNaN(altitude)) {
                await serialConnection.setAltitude(altitude);
            }
        });
    }
});
