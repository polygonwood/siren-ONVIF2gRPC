// index.js

require('dotenv').config();

const { startOnvifServer } = require('./src/onvif/onvifServer');
const { startWebServer } = require('./src/web/server');
const deviceState = require('./src/state/deviceState');

console.log('Starting application...');

// Start the ONVIF and Web servers
startOnvifServer();
startWebServer();

// Example of how to update the state from another part of the application
// In a real application, this would be triggered by gRPC messages from the device
// Update state every 5 seconds
// setInterval(() => {
//     deviceState.setState({
//         ptz: {
//             x: Math.random().toFixed(3),
//             y: Math.random().toFixed(3),
//             z: Math.random().toFixed(3),
//         }
//     });
// }, 5000);
