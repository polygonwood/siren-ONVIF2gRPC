// src/web/server.js

const express = require('express');
const path = require('path');
const deviceState = require('../state/deviceState');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint for Server-Sent Events
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish the connection

    const sendState = (state) => {
        res.write(`data: ${JSON.stringify(state)}

`);
    };

    // Send the initial state immediately
    sendState(deviceState.getState());

    // Subscribe to state changes
    deviceState.on('change', sendState);

    // Clean up when the client closes the connection
    req.on('close', () => {
        deviceState.removeListener('change', sendState);
    });
});

function startWebServer() {
    app.listen(PORT, () => {
        console.log(`Web server listening on http://localhost:${PORT}`);
    });
}

module.exports = { startWebServer };
