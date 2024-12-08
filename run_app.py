import subprocess
import time
import serial
import json
from threading import Thread
from http.server import HTTPServer, SimpleHTTPRequestHandler
import serial.tools.list_ports
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the directory containing run_app.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class DroneSerialHandler(SimpleHTTPRequestHandler):
    serial_port = None
    
    def send_cors_headers(self):
        """Add CORS and cache control headers to response"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 hours
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        # Handle API endpoints
        if self.path == '/list_ports':
            try:
                ports = []
                for port in serial.tools.list_ports.comports():
                    # Include all ports without filtering
                    ports.append({
                        "port": port.device,
                        "description": port.description,
                        "hwid": port.hwid
                    })
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(ports).encode())
                logger.info(f"Found ports: {ports}")
                
            except Exception as e:
                logger.error(f"Error listing ports: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        # Handle static files
        try:
            # Map the requested path to the actual file path
            if self.path == '/':
                file_path = os.path.join(BASE_DIR, 'index.html')
            else:
                # Remove leading slash and join with base directory
                clean_path = self.path.lstrip('/')
                file_path = os.path.join(BASE_DIR, clean_path)

            # Validate the path is within BASE_DIR
            if not os.path.abspath(file_path).startswith(BASE_DIR):
                raise Exception("Invalid path")
            
            # Map file extensions to content types
            content_types = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.ico': 'image/x-icon'
            }
            
            ext = os.path.splitext(file_path)[1]
            
            with open(file_path, 'rb') as f:
                self.send_response(200)
                if ext in content_types:
                    self.send_header('Content-type', content_types[ext])
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(f.read())
                logger.debug(f"Served file: {file_path}")
                
        except FileNotFoundError:
            logger.error(f"File not found: {self.path}")
            self.send_error(404, f"File not found: {self.path}")
        except Exception as e:
            logger.error(f"Error serving file: {e}")
            self.send_error(500, f"Server error: {str(e)}")

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data) if content_length > 0 else {}
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        if self.path == '/connect':
            try:
                port = data.get('port')
                baudrate = data.get('baudrate', 115200)
                
                if DroneSerialHandler.serial_port:
                    DroneSerialHandler.serial_port.close()
                    
                DroneSerialHandler.serial_port = serial.Serial(port, baudrate)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"status": "connected"}).encode())
                
            except Exception as e:
                logger.error(f"Connection error: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
            
        elif self.path == '/send_command':
            try:
                command = data.get('command')
                
                if not DroneSerialHandler.serial_port or not DroneSerialHandler.serial_port.is_open:
                    raise Exception("Serial port not connected")
                    
                # Add command terminator
                command = f"{command}\n"
                DroneSerialHandler.serial_port.write(command.encode())
                
                # Wait for response if it's a query command
                if '?' in command:
                    response = self.read_response()
                else:
                    # Flush the write buffer
                    DroneSerialHandler.serial_port.flush()
                    response = {"status": "sent", "command": command.strip()}
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                    
            except Exception as e:
                logger.error(f"Command error: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        self.send_error(404)

    def read_response(self, timeout=1.0):
        """Read response from serial port for query commands"""
        if not DroneSerialHandler.serial_port:
            return {"error": "No serial connection"}
            
        start_time = time.time()
        response = []
        
        while (time.time() - start_time) < timeout:
            if DroneSerialHandler.serial_port.in_waiting:
                line = DroneSerialHandler.serial_port.readline().decode().strip()
                response.append(line)
                if not DroneSerialHandler.serial_port.in_waiting:
                    break
                    
        return {"response": response} if response else {"error": "No response"}

def start_http_server():
    try:
        # Change working directory to where run_app.py is located
        os.chdir(BASE_DIR)
        server = HTTPServer(('127.0.0.1', 5000), DroneSerialHandler)
        logger.info(f"HTTP server running on http://127.0.0.1:5000 from {BASE_DIR}")
        server.serve_forever()
    except Exception as e:
        logger.error(f"Failed to start HTTP server: {e}")
        raise

class ApplicationManager:
    def __init__(self):
        self.electron_process = None
        self.running = True

    def start_electron(self):
        """Start Electron application"""
        try:
            self.electron_process = subprocess.Popen(
                ['npx', 'electron', '.'], 
                shell=True
            )
            logger.info("Electron app started")
        except Exception as e:
            logger.error(f"Failed to start Electron: {e}")
            self.running = False

    def run(self):
        """Main application entry point"""
        try:
            # Start HTTP server in separate thread
            http_thread = Thread(target=start_http_server)
            http_thread.daemon = True
            http_thread.start()

            # Start Electron in main thread
            self.start_electron()

            # Keep main thread alive
            while self.running:
                if self.electron_process.poll() is not None:
                    logger.info("Electron process ended")
                    break
                time.sleep(0.1)

        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        finally:
            self.cleanup()

    def cleanup(self):
        """Clean shutdown of all components"""
        self.running = False
        
        if DroneSerialHandler.serial_port and DroneSerialHandler.serial_port.is_open:
            DroneSerialHandler.serial_port.close()
        
        if self.electron_process:
            self.electron_process.terminate()
            try:
                self.electron_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.electron_process.kill()

        logger.info("Application shutdown complete")

def main():
    app = ApplicationManager()
    app.run()

if __name__ == "__main__":
    main() 