/**
 * Library for handling file system data
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Create the library container
var lib = {};

// Define the root directory of the file system
lib.root = path.join(__dirname, "./../.data/");

// Write data to file system
lib.create = (dir, file, data, callback) => {
    // Create the new file
    fs.open(lib.root + dir + '/' + file + '.json',
    "wx",
    (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            // Stringify the data object
            var dataString = JSON.stringify(data);
            // Append the new data
            fs.writeFile(fileDescriptor, dataString, (err) => {
                if(!err) {
                    // Close the file
                    fs.close(fileDescriptor, (err) => {
                        if(!err) {
                            callback(false);
                        } else {
                            callback("Error: Could not close the new file");
                        }
                    })
                } else {
                    callback("Error: Could not write data to new file");
                }
            });
        } else {
            callback("Error: Could not create the file");
        }
    });
};

// Read data from file system
lib.read = (dir, file, callback) => {
    // Open the file for reading
    fs.readFile(lib.root + dir + '/' + file + '.json', (err, data) => {
        if(!err) {
            // Parse the data to object form and send to requester
            var parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    });
};

// Update data in file system
lib.update = (dir, file, data, callback) => {
    // Open the file to check if it exists
    fs.open(lib.root + dir + '/' + file + '.json',
    "r+",
    (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            // Make room for new data
            fs.truncate(fileDescriptor, (err) => {
                if(!err) {
                    // Stringify the new data
                    var dataString = JSON.stringify(data);
                    // Write new data to file
                    fs.writeFile(fileDescriptor, dataString, (err) => {
                        if(!err) {
                            // Close the file 
                            fs.close(fileDescriptor, (err) => {
                                if(!err) {
                                    callback(false);
                                } else {
                                    callback("Error: Failed to close the file");
                                }
                            });
                        } else {
                            callback("Error: Failed to write new data to file");
                        }
                    })
                } else {
                    callback("Error: Failed to truncate the file");
                }
            });
        } else {
            callback("Error: Could not open the file, it may not exist yet");
        }
    });
};

// Delete a file from file system
lib.delete = (dir, file, callback) => {
    fs.unlink(lib.root + dir + '/' + file + '.json',
    (err) => {
        if(!err) {
            callback(false);
        } else {
            callback("Error: Could not delete the file");
        }
    });
};

// List all files in directory
lib.list = (dir, callback) => {
    // Read the directory content
    fs.readdir(lib.root + dir, (err, files) => {
        if(!err && files && files.length > 0) {
            // trim the file extension
            var trimmedFileNames = [];
            files.forEach((file) => {
                trimmedFileNames.push(file.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, files);
        }
    });
};

// Export the library
module.exports = lib;