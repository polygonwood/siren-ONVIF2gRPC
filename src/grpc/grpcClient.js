// src/grpc/grpcClient.js

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// --- IMPORTANT ---
// You must place your .proto file in the 'proto' directory for this to work.
const PROTO_PATH = path.join(__dirname, '../../proto/your_service.proto'); // Replace with your .proto file

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
// Replace 'yourpackage' with the package name from your .proto file
const device_proto = protoDescriptor.yourpackage; 

const GRPC_SERVER_ADDRESS = process.env.GRPC_SERVER_ADDRESS || 'localhost:50051';

// Create the client
// Replace 'YourService' with the service name from your .proto file
const client = new device_proto.YourService(GRPC_SERVER_ADDRESS, grpc.credentials.createInsecure());

console.log(`gRPC client connecting to ${GRPC_SERVER_ADDRESS}`);

// Example function to be called by the translation layer
// You will need to implement functions for each gRPC call you want to make
function getStreamUri(params) {
    return new Promise((resolve, reject) => {
        client.getStreamUri(params, (err, response) => {
            if (err) {
                console.error('gRPC Error:', err);
                return reject(err);
            }
            resolve(response);
        });
    });
}

function absoluteMove(params) {
    return new Promise((resolve, reject) => {
        client.absoluteMove(params, (err, response) => {
            if (err) {
                console.error('gRPC Error:', err);
                return reject(err);
            }
            resolve(response);
        });
    });
}

module.exports = {
    client,
    getStreamUri, // Export other functions as you create them
    absoluteMove,
};
