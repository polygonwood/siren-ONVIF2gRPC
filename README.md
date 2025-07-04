# ONVIF to gRPC Translator

This Node.js application acts as a virtual ONVIF camera, translating incoming ONVIF messages into gRPC calls to a target device and converting gRPC responses back into ONVIF messages.

## Architecture

The application follows a modular, three-layered architecture to ensure separation of concerns, making it easier to develop, test, and maintain.

### 1. ONVIF Listener Layer (Facade)

*   **Responsibility:** This layer presents itself to the network as a standard ONVIF-compliant camera. Its sole job is to handle ONVIF communication.
*   **Components:**
    *   **WS-Discovery Service:** Listens for network discovery probes from VMS (Video Management Systems) and responds, making the virtual camera discoverable.
    *   **SOAP Web Server:** An HTTP server that listens for and responds to ONVIF commands (which are SOAP/XML messages). It parses incoming XML requests and formats outgoing responses.

### 2. Translation Layer (Core Logic)

*   **Responsibility:** This is the heart of the application. It acts as the bidirectional translator between the ONVIF and gRPC protocols.
*   **Components:**
    *   **Request Mapper:** Takes a parsed ONVIF command (e.g., `GetStreamUri`) and maps it to the corresponding gRPC service call (e.g., `device.getStreamUri()`).
    *   **Response Mapper:** Takes a gRPC response from the device and transforms it into the correct structure for an ONVIF SOAP response.
    *   **State Management:** Manages device state that needs to be exposed via ONVIF (e.g., current PTZ position, video profiles) and makes it observable via a simple web interface.

### 3. gRPC Client Layer (Adapter)

*   **Responsibility:** This layer handles all communication with the actual gRPC-enabled device.
*   **Components:**
    *   **gRPC Client:** Manages the connection to the gRPC server on the device.
    *   **Protocol Buffers (Proto) Loader:** Loads the device's `.proto` files to understand the available services, methods, and message structures.

## Web Interface

A simple web server is included to provide a real-time view of the device's state as understood by the translation layer. This is useful for debugging and monitoring.
