// vms-simulation-app/index.js

const Discovery = require('../wsdiscovery');
const soapRequest = require('easy-soap-request');
const { v4: uuidv4 } = require('uuid');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',  // optional, makes x/y easier to access
});

const discoveredCameras = new Map();
const discovery = new Discovery({ log: true, logLevel: 'info' });

// --- ONVIF Command Functions ---

/**
 * Sends a GetStreamUri request to a camera.
 * @param {string} cameraUrl - The URL of the camera's ONVIF service.
 */
async function getStreamUri(cameraUrl) {
    const soapHeaders = {
        'Content-Type': 'application/soap+xml; charset=utf-8',
    };
    const xml = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tmd="http://www.onvif.org/ver10/media/wsdl">
            <soap:Body>
                <tmd:GetStreamUri>
                    <tmd:ProfileToken>default</tmd:ProfileToken>
                </tmd:GetStreamUri>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        console.log(`Sending GetStreamUri to ${cameraUrl}`);
        const { response } = await soapRequest({ url: cameraUrl, headers: soapHeaders, xml: xml });
        let getStreamUriResponse = parser.parse(response.body);
        let streamUri = getStreamUriResponse['soap:Envelope']['soap:Body']['trt:GetStreamUriResponse']['trt:MediaUri']['tt:Uri'];
        // console.log('GetStreamUri Response:', streamUri, response.body);
        return streamUri;
    } catch (error) {
        console.error('Error sending GetStreamUri:', error.message);
    }
}

/**
 * Sends an AbsoluteMove command with random PTZ values.
 * @param {string} cameraUrl - The URL of the camera's ONVIF service.
 */
async function sendAbsoluteMove(cameraUrl) {
    const soapHeaders = {
        'Content-Type': 'application/soap+xml; charset=utf-8',
    };
    const randomPan = (Math.random() * 2 - 1).toFixed(2); // -1.00 to 1.00
    const randomTilt = (Math.random() * 2 - 1).toFixed(2);
    const randomZoom = Math.random().toFixed(2); // 0.00 to 1.00

    const xml = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
            <soap:Header>
                <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:uuid:${uuidv4()}</wsa:MessageID>
            </soap:Header>
            <soap:Body>
                <tptz:AbsoluteMove>
                    <tptz:ProfileToken>default</tptz:ProfileToken>
                    <tptz:Position>
                        <tt:PanTilt x="${randomPan}" y="${randomTilt}"/>
                        <tt:Zoom x="${randomZoom}"/>
                    </tptz:Position>
                </tptz:AbsoluteMove>
            </soap:Body>
        </soap:Envelope>
    `;

    try {
        console.log(`Sending AbsoluteMove to ${cameraUrl} with Pan=${randomPan}, Tilt=${randomTilt}, Zoom=${randomZoom}`);
        const { response } = await soapRequest({ url: cameraUrl, headers: soapHeaders, xml: xml });
        console.log('AbsoluteMove ack');
    } catch (error) {
        console.error('Error sending AbsoluteMove:', error.message);
    }
}

// --- Discovery Logic ---

// discovery.bind(() => {
//     console.log('WS-Discovery client bound and ready.');
// });



// discovery.on('hello', (device) => {
//     const cameraAddress = device.xaddrs[0];
//     if (!discoveredCameras.has(cameraAddress)) {
//         console.log(`Discovered ONVIF camera: ${cameraAddress} via hello`);
//         discoveredCameras.set(cameraAddress, device);

//         // 1. Send GetStreamUri immediately upon discovery
//         getStreamUri(cameraAddress);

//         // 2. Send AbsoluteMove every 10 seconds
//         setInterval(() => {
//             sendAbsoluteMove(cameraAddress);
//         }, 10000);
//     }
// });

discovery.on('device', async (device) => {
    // console.log('Discovered device:', device);
    const cameraAddress = device.xaddrs;
    if (!discoveredCameras.has(cameraAddress)) {
        console.log(`Discovered ONVIF camera: ${cameraAddress} via probe`);
        
        // 1. Send GetStreamUri immediately upon discovery
        let streamURI = await getStreamUri(cameraAddress);
        console.log(`Stream URI for ${cameraAddress}:`, streamURI);
        
        // 2. Send AbsoluteMove every 10 seconds
        let timer = setInterval(() => {
            sendAbsoluteMove(cameraAddress);
        }, 10000);
        device.timer = timer; // Store the timer in the device object for potential future use
        discoveredCameras.set(cameraAddress, device);
    }
    else console.log(`Camera at ${cameraAddress} already discovered.`);
});

discovery.on('bye', (device) => {
    const cameraAddress = device.xaddrs;
    if (discoveredCameras.has(cameraAddress)) {
        console.log(`Camera at ${cameraAddress} went offline.`);
        let timer = discoveredCameras.get(cameraAddress).timer;
        if (timer) {
            clearInterval(timer); // Stop the interval for this camera
            console.log(`Stopped AbsoluteMove interval for ${cameraAddress}`);
        }
        // remove the device from the discovery map
        discoveredCameras.delete(cameraAddress);
        console.log(`Removed ${cameraAddress} from discovered cameras.`);
    }
});

async function main() {
    console.log('VMS simulation started. Listening for ONVIF cameras...');
    function probe() {
        discovery.probe({
            timeout: 5000
        }, (err) => {
            if (err) {
                console.error('Error during discovery probe:', err);
            } else {
                console.log('Probe sent.');
            }
        })
    }
    probe();
    setInterval(() => {
        probe()
    }, 10000);
    await new Promise(() => { });
}

main();