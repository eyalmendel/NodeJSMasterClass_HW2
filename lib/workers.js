/**
 * A module for server background jobs
 */

// Dependencies
const _data = require('./data');
const config = require('./config');

// Container for workers module
var workers = {};

// Delete expired tokens from the file system
workers.deleteExpiredTokens = () => {
    // Get a list of all the files in the tokens directory
    _data.list('tokens', (err, tokens) => {
        if(!err && tokens) {
            // Iterate over all the token files
            tokens.forEach((token) => {
                // Lookup the token file
                _data.read('tokens', token, (err, tokenData) => {
                    if(!err && tokenData) {
                        // Check the token's expiration and delete it if it's overdue
                        var expiration = tokenData.expires;
                        if(expiration > Date.now()) {
                            _data.delete('tokens', token, (err) => {
                                if(!err) {
                                    console.log("Expired token file was deleted successfully");
                                } else {
                                    console.log("Failed to delete the expired token file");
                                }
                            });
                        }
                    } else {
                        console.log("Failed to read a token file. Skipping it");
                    }
                });
            });
        } else {
            console.log("Failed to get the list of tokens from the file system");
        }
    });
};

// Loop of background jobs
workers.loop = () => {
    // Set the timer for deleting the expired tokens
    setInterval(() => {
        workers.deleteExpiredTokens();
    }
    ,config.workers.tokenRemovalInterval)
};

// Workers init function
workers.init = () => {
    // Start the loop of background jobs
    workers.loop();
};

// Export the module
module.exports = workers;