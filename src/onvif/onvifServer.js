// src/onvif/onvifServer.js

const http = require('http');
const Discovery = require('ws-discovery');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const deviceState = require('../state/deviceState');
const grpcClient = require('../grpc/grpcClient'); // You'll use this to make gRPC calls
const { log } = require('console');
const { types } = require('util');
const { on } = require('events');

const ONVIF_PORT = process.env.ONVIF_PORT || 8080;
const PROBE_TIMEOUT = 5000; // 5 seconds

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',  // optional, makes x/y easier to access
});

const builder = new XMLBuilder();

const myDevice = {
    address: `http://localhost:${ONVIF_PORT}/onvif/device_service`,
    types: 'dn:NetworkVideoTransmitter',
    xaddrs: `http://localhost:${ONVIF_PORT}/onvif/device_service`,
    metadataVersion: '1',
}

// const myDevice = {
//     '@': {
//         'xmlns': 'http://www.onvif.org/ver10/schema',
//         'xmlns:wsa': 'http://schemas.xmlsoap.org/ws/2004/08/addressing',
//         'xmlns:wsd': 'http://schemas.xmlsoap.org/ws/2005/04/discovery',
//         'xmlns:wsnt': 'http://docs.oasis-open.org/wsn/b-2',
//         'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-security-header-1.0.xsd',
//         'xmlns:wsrf': 'http://docs.oasis-open.org/wsrf/bf-2',
//         'xmlns:tt': 'http://www.onvif.org/ver10/schema',
//         'xmlns:tptz': 'http://www.onvif.org/ver20/ptz/wsdl',
//         'xmlns:tds': 'http://www.onvif.org/ver10/device/wsdl',
//         'xmlns:trt': 'http://www.onvif.org/ver10/media/wsdl',
//         'xmlns:tns': 'http://www.onvif.org/ver10/device/wsdl',
//         'xmlns:dn': 'http://www.onvif.org/ver10/network/wsdl',
//         'xmlns:wsd': 'http://schemas.xmlsoap.org/ws/2005/04/discovery',
//         'xmlns:wsnt': 'http://docs.oasis-open.org/wsn/b-2',
//         'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
//         'xmlns:wsrf': 'http://docs.oasis-open.org/wsrf/bf-2',
//     },
//     'wsa:EndpointReference': {
//         'wsa:Address': `http://localhost:${ONVIF_PORT}/onvif/device_service`
//     },
//     'wsa:MetadataVersion': '1',
//     'wsa:Capabilities': {
//         'wsa:Discovery': {
//             'wsa:Scopes': 'onvif://www.onvif.org/location/country/usa onvif://www.onvif.org/name/VirtualCamera',
//             'wsa:XAddrs': `http://localhost:${ONVIF_PORT}/onvif/device_service`
//         },
//         'wsa:Device': {
//             'wsa:Types': 'dn:NetworkVideoTransmitter',
//             'wsa:Scopes': 'onvif://www.onvif.org/location/country/usa onvif://www.onvif.org/name/VirtualCamera',
//             'wsa:XAddrs': `http://localhost:${ONVIF_PORT}/onvif/device_service`,
//             'wsa:MetadataVersion': '1',
//             'wsa:DeviceCapabilities': {
//                 'wsa:NetworkCapabilities': {
//                     'wsa:IPFilter': true,
//                     'wsa:ZeroConfiguration': true,
//                     'wsa:IPVersion6': false,
//                     'wsa:NetworkProtocols': {
//                         'wsa:TCP': true,
//                         'wsa:UDP': true,
//                         'wsa:HTTP': true,
//                         'wsa:HTTPS': true,
//                         'wsa:RTSP': true
//                     },
//                     'wsa:SystemBackup': true,
//                     'wsa:SystemLogging': true,
//                     'wsa:FirmwareUpgrade': true,
//                 }
//             }
//         }
//     },
//     'wsa:PTZ': {
//         'wsa:Capabilities': {
//             'wsa:AbsoluteMove': true,
//             'wsa:RelativeMove': true,
//             'wsa:ContinuousMove': true,
//             'wsa:GetStatus': true,
//             'wsa:GetConfiguration': true
//         }
//     },
//     'wsa:Media': {
//         'wsa:Capabilities': {
//             'wsa:GetStreamUri': true,
//             'wsa:GetSnapshotUri': true,
//             'wsa:GetVideoEncoderConfigurationOptions': true,
//             'wsa:GetAudioEncoderConfigurationOptions': true,
//             'wsa:GetAudioOutputConfigurationOptions': true,
//             'wsa:GetVideoAnalyticsConfigurationOptions': true
//         }
//     },
//     'wsa:Analytics': {
//         'wsa:Capabilities': {
//             'wsa:GetAnalyticsConfiguration': true
//         }
//     }
// };

const discovery = new Discovery({ device: myDevice, log: true, logLevel: 'info', hello: true, port: ONVIF_PORT });

// listen to multicast socket events
discovery.bind(() => {
    console.log('WS-Discovery client bound and ready.');
});

// --- WS-Discovery --- 
function startDiscovery() {
    discovery.on('probe', (probe, rinfo) => {
        console.log('Received probe from:', rinfo.address);
        // Here you would construct a proper probe match response
        // This is a simplified example
        const response = {
            "@": {
                "xmlns:d": "http://schemas.xmlsoap.org/ws/2005/04/discovery",
                "xmlns:a": "http://schemas.xmlsoap.org/ws/2004/08/addressing"
            },
            "d:ProbeMatches": {
                "d:ProbeMatch": {
                    "a:EndpointReference": {
                        "a:Address": `http://${rinfo.address}:${ONVIF_PORT}/onvif/device_service`
                    },
                    "d:Types": "dn:NetworkVideoTransmitter",
                    "d:Scopes": "onvif://www.onvif.org/location/country/usa onvif://www.onvif.org/name/VirtualCamera",
                    "d:XAddrs": `http://${rinfo.address}:${ONVIF_PORT}/onvif/device_service`
                }
            }
        };
        discovery.replyToProbe(response, rinfo);
        // discovery.probeMatch(response, rinfo);
    });

}

// --- SOAP Server --- 
const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        // console.log('Received ONVIF request:', body.toString());
        const onvifRequest = parser.parse(body);
        
        // *** This is where the translation logic will go ***
        const soapBody = onvifRequest['soap:Envelope']['soap:Body'];
        
        
        if (soapBody['tmd:GetStreamUri']) {
            console.log('Received ONVIF request GetStreamURI');
            try {
                const uriRequest = soapBody['tmd:GetStreamUri'];
                const grpcParams = {
                    profileToken: uriRequest['tmd:ProfileToken'],

                };
                console.log('tmd', grpcParams);

                // Call the gRPC client
                const grpcResponse = await grpcClient.getStreamUri(grpcParams);
                console.log('calling gRPC get stream URI');

                // Update the local device state with the command sent and the response from the device
                deviceState.setState({
                    lastCommand: { type: 'GetStreamUri', params: grpcParams },
                    uri: grpcResponse.uri
                });

                // Construct the ONVIF response
                const onvifResponse = {
                    '@': {
                        "xmlns:d": "http://schemas.xmlsoap.org/ws/2005/04/discovery",
                        "xmlns:a": "http://schemas.xmlsoap.org/ws/2004/08/addressing",
                        "xmlns:tt": "http://www.onvif.org/ver10/schema",
                        "xmlns:trt": "http://www.onvif.org/ver10/media/wsdl"
                    },
                    'soap:Envelope': {
                        'soap:Body': {
                            'trt:GetStreamUriResponse': {
                                'trt:MediaUri': {
                                    'tt:Uri': grpcResponse.uri,
                                    'tt:InvalidAfterConnect': false,
                                    'tt:InvalidAfterReboot': true,
                                    'tt:Timeout': 'PT60S'
                                }
                            }
                        },
                    },
                };

                const xmlResponse = builder.build(onvifResponse);
                res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
                res.end(xmlResponse);

            } catch (error) {
                console.error('Error processing AbsoluteMove:', error);
                // Handle gRPC errors and send a SOAP Fault
                res.writeHead(500, { 'Content-Type': 'application/soap+xml' });
                // A real implementation should build a proper SOAP Fault message
                res.end('<SOAP-ENV:Fault><SOAP-ENV:Code><SOAP-ENV:Value>SOAP-ENV:Receiver</SOAP-ENV:Value></SOAP-ENV:Code><SOAP-ENV:Reason><SOAP-ENV:Text xml:lang="en">Internal Server Error</SOAP-ENV:Text></SOAP-ENV:Reason></SOAP-ENV:Fault>');
            }
            return; // Request handled
        }
        // Check for AbsoluteMove command
        if (soapBody['tptz:AbsoluteMove']) {
            console.log('Received ONVIF request AbsoluteMove');
            try {
                const moveRequest = soapBody['tptz:AbsoluteMove'];
                const grpcParams = {
                    profileToken: moveRequest['tptz:ProfileToken'],
                    position: {
                        pan: parseFloat(moveRequest['tptz:Position']['tt:PanTilt']['x']),
                        tilt: parseFloat(moveRequest['tptz:Position']['tt:PanTilt']['y']),
                        zoom: parseFloat(moveRequest['tptz:Position']['tt:Zoom']['x']),
                    },
                };
                console.log('tptz', grpcParams);

                // Call the gRPC client
                const grpcResponse = await grpcClient.absoluteMove(grpcParams);
                console.log('calling gRPC absolute move');

                // Update the local device state with the command sent and the response from the device
                deviceState.setState({
                    lastCommand: { type: 'AbsoluteMove', params: grpcParams },
                    ptz: grpcParams.position
                });

                // Construct the ONVIF response
                const onvifResponse = {
                    'soap:Envelope': {
                        'soap:Body': {
                            'tptz:AbsoluteMoveResponse': {},
                        },
                    },
                };

                const xmlResponse = builder.build(onvifResponse);
                res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
                res.end(xmlResponse);

            } catch (error) {
                console.error('Error processing AbsoluteMove:', error);
                // Handle gRPC errors and send a SOAP Fault
                res.writeHead(500, { 'Content-Type': 'application/soap+xml' });
                // A real implementation should build a proper SOAP Fault message
                res.end('<SOAP-ENV:Fault><SOAP-ENV:Code><SOAP-ENV:Value>SOAP-ENV:Receiver</SOAP-ENV:Value></SOAP-ENV:Code><SOAP-ENV:Reason><SOAP-ENV:Text xml:lang="en">Internal Server Error</SOAP-ENV:Text></SOAP-ENV:Reason></SOAP-ENV:Fault>');
            }
            return; // Request handled
        }

        // Placeholder for other commands
        res.writeHead(200, { 'Content-Type': 'application/soap+xml' });
        res.end('<soap:Envelope><soap:Body></soap:Body></soap:Envelope>'); // Empty response for now
    });
});

function startOnvifServer() {
    startDiscovery();
    server.listen(ONVIF_PORT, () => {
        console.log(`ONVIF server listening on http://localhost:${ONVIF_PORT}`);
    });
}

module.exports = { startOnvifServer };
