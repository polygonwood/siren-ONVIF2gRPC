// src/state/deviceState.js

const { EventEmitter } = require('events');

class DeviceState extends EventEmitter {
    constructor() {
        super();
        // Initial default state
        this.state = {
            firmwareVersion: '1.0.0',
            deviceName: 'Virtual ONVIF Camera',
            uri: 'rtsp://',
            ptz: {
                pan: 0,
                tilt: 0,
                zoom: 0,
            },
            video: {
                profile: 'default',
                encoding: 'H.264',
                resolution: '1920x1080',
                framerate: 30,
            },
            lastChange: new Date().toISOString(),
        };
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        // Simple merge, for more complex state, a deep merge might be needed
        this.state = { ...this.state, ...newState, lastChange: new Date().toISOString() };
        // Notify listeners that the state has changed
        this.emit('change', this.state);
        console.log('Device state updated');//, this.state);
    }
}

// Export a singleton instance
module.exports = new DeviceState();
