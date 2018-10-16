/**
 * A module for server background jobs
 */

// Dependencies
const _data = require('./data');

// Container for workers module
var workers = {};

// Delete expired tokens from the file system
workers.deleteExpiredTokens = () => {

};

// Loop of background jobs
workers.loop = () => {

};

// Workers init function
workers.init = () => {
    // Start the loop of background jobs
    workers.loop();
};

// Export the module
module.exports = workers;