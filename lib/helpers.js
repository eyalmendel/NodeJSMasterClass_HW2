/**
 * Functionality for different tasks
 */


// Dependencies
const crypto = require('crypto');
const config = require('./config');

// Create a container for the module
var helpers = {};

// Parse a JSON string to an object in all cases (avoid throwing)
helpers.parseJsonToObject = (str) => {
    try {
        var obj = JSON.parse(str);
        return obj;
    } catch(e) {
        return {};
    }
};

// Hash a string 
helpers.hashString = (str) => {
    // Check that the input is valid
    if(typeof(str) == 'string' && str.length > 0) {
        var hashedString = crypto.createHmac('sha256', config.hashKey)
        .update(str)
        .digest('hex');
        return hashedString;
    } else {
        return false;
    }
};  

// Create a string of random alphnumeric characters 
helpers.createRandomString = function(size) {
    size = typeof(size) == 'number' && size > 0
    ? size
    : false;
    
    if(size) {
        // Define all possible characters available
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        
        var str = '';

        // Fill str with random characters
        for(i = 0; i < size; i++) {
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomCharacter;
        }
        return str;
    } else {
        return false;
    }
};

// Check if the input string is a valid e-mail address
helpers.isValidEmail = (str) => {
    // Define the valid email pattern
    var validEmailPattern = /^([a-zA-Z0-9-_\.]+)@([a-zA-Z0-9-]+)\.([a-z]{2,8})([\.a-z]{2,8})?$/;

    if(validEmailPattern.test(str)) {
        return true;
    } else {
        return false;
    }

};

// Export the module
module.exports = helpers;