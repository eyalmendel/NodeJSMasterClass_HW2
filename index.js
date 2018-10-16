/*
*   Entry point for project
*/

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Create a container for the app
var app = {};

// Define the app init function
app.init = () => {
    // Instantiate the server
    server.init();
    // Instantiate the background workers
    workers.init();
};

// Instantiate the app
app.init();

// Export the app module for 3rd parties
module.exports = app;