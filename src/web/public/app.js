// src/web/public/app.js

const stateOutput = document.getElementById('state-output');

const eventSource = new EventSource('/events');

eventSource.onmessage = function(event) {
    const state = JSON.parse(event.data);
    stateOutput.textContent = JSON.stringify(state, null, 2);
};

eventSource.onerror = function() {
    stateOutput.textContent = 'Failed to connect to server. Retrying...';
    eventSource.close();
    // Optional: implement a reconnect mechanism
};
