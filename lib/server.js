/**
 * Server module
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const StringDecoder = require('string_decoder').StringDecoder;
const handlers = require('./handlers');
const helpers = require('./helpers');

// Container for server
var server = {};

// Create a server for HTTP requests
server.httpServer = http.createServer((request, response) => {
    server.serverLogic(request, response);
});

// Create a server for HTTPS requests
var httpsOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(httpsOptions, (request, response) => {
    server.serverLogic(request, response);
});

// Unified server logic for HTTP/HTTPS requests
server.serverLogic = (request, response) => {
    // Parsing the request URL
    var parsedUrl = url.parse(request.url, true);
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, "");

    // Get the request query string as an object
    var queryStringObject = parsedUrl.query;

    // Parse the HTTP method
    var method = request.method.toLowerCase();

    // Get request headers
    var headers = request.headers;

    // Get the request payload
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    request.on('data', (data) => {
        buffer += decoder.write(data);
    });
    request.on('end', () => {
        // Fill the buffer with any remaining data left
        buffer += decoder.end();
        
        // Determine the right handler for the request
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined'
        ? server.router[trimmedPath]
        : handlers.notFound;

        // Build the data object to be sent to the handler
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler
        chosenHandler(data, (statusCode, payload) => {
            // Define default values for statusCode and payload
            statusCode = typeof(statusCode) == 'number'
            ? statusCode
            : 200;
            payload = typeof(payload) == 'object'
            ? payload
            : {};

            // Convert the payload to a string
            var payloadString = JSON.stringify(payload);

            // Send back the response
            response.setHeader('Content-Type', 'application/json');
            response.writeHead(statusCode);
            response.end(payloadString);

            // Log the request
            console.log("Returning: ", statusCode, payloadString);
        });
    });
};

// Define the requests router
server.router = {
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'categories' : handlers.categories,
    'items' : handlers.items,
    'cart' : handlers.cart,
    'orders' : handlers.orders
};


// Initialize server
server.init = () => {
    // Listen to requests on HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log("HTTP server starts listening on port " + config.httpPort);
    });

    // Listen to requests on HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log("HTTPS server starts listening on port " + config.httpsPort);
    });
};


// Export module
module.exports = server;