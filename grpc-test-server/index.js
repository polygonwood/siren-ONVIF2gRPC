// grpc-test-server/index.js

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/your_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const yourpackage = protoDescriptor.yourpackage;

const server = new grpc.Server();

const GRPC_SERVER_ADDRESS = '0.0.0.0:50051';

// --- Service Implementation ---

/**
 * Mock implementation for GetStreamUri.
 * @param {object} call - The gRPC call object.
 * @param {function} callback - The callback to send the response.
 */
function getStreamUri(call, callback) {
    console.log('Received GetStreamUri request:', call.request);
    callback(null, {
        uri: 'rtsp://127.0.0.1/live/mainstream'
    });
}

/**
 * Mock implementation for AbsoluteMove.
 * @param {object} call - The gRPC call object.
 * @param {function} callback - The callback to send the response.
 */
function absoluteMove(call, callback) {
    console.log('Received AbsoluteMove request:', call.request);
    // Echo back the position that was requested
    callback(null, {
        position: call.request.position
    });
}

// Add the service to the server
server.addService(yourpackage.YourService.service, {
    getStreamUri: getStreamUri,
    absoluteMove: absoluteMove,
});

// Start the server
server.bindAsync(GRPC_SERVER_ADDRESS, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to bind server:', err);
        return;
    }
    server.start();
    console.log(`gRPC test server listening on ${GRPC_SERVER_ADDRESS}`);
});
