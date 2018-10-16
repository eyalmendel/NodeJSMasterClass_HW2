/**
 * Handles the integration with Stripe.com payment platform
 */

// Dependencies
const config = require('./config');
const _data = require('./data');
const querystring = require('querystring');
const https = require('https');
const path = require('path');
const StringDecoder = require('string_decoder').StringDecoder;

// Container for the billing module
var billing = {};

// Defining the receipts' root directory
billing.receiptDirRoot = path.join(__dirname, "./../.data/orders/");

// Create the charge using the Stripe API
billing.chargeViaStripe = (orderData, callback) => {
    // Validate the order data
    var total = typeof(orderData.total) == 'number'
    && orderData.total >= 50
    ? orderData.total
    : false;
    
    if(total) {
        // Create the https request payload
        var payload = {
            'amount' : total,
            'currency' : orderData.currency,
            'source' : orderData.token
        };

        // Stringify the payload
        var payloadString = querystring.stringify(payload);

        // Create the https request options
        var requestOptions = {
            'protocol' : 'https:',
            'hostname' : 'api.stripe.com',
            'method' : 'POST',
            'path' : '/v1/charges',
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Authorization' : "Bearer " + config.stripe.privateKey
            }
        };

        // Instantiate the https request
        var request = https.request(requestOptions, (response) => {
            var status = response.statusCode;

            if(status == 200 || status == 201) {
                // Save the order record to the file system
                _data.create('orders', orderData.id, orderData, (err) => {
                    if(!err) {
                        // Update the id record
                        var nextOrderId = {
                            'id' : orderData.id + 1
                        };
                        _data.update('orders', 'nextOrderId', nextOrderId, (err) => {
                            // Send the user an email with the order receipt
                            billing.sendReceiptViaMailgun(orderData, callback);
                        });
                    } else {
                        callback(500, {"Error" : "Couldn't save the order"});
                    }
                });
            } else {
                callback(status, {"Error" : "Failed to complete the charging process. Order discarded"});
            }

            // var decoder = new StringDecoder('utf-8');
            // var buffer = '';
            // response.on('data', (data) => {
            //     buffer += decoder.write(data);
            // });
            // response.on('end', () => {
            //     buffer += decoder.end();
            //     console.log(buffer);
            // });
                
        });

        // Bind to errors
        request.on('error', (err) => {
            callback(err);
        });

        // Add the request payload
        request.write(payloadString);

        // Send the request
        request.end();
    } else {
        callback(400, {"Error" : "Total amount too small, should be at least 50 cents"});
    }
};

billing.sendReceiptViaMailgun = (orderData, callback) => {
    // Create the request payload
    var file = path.join(billing.receiptDirRoot + orderData.id + '.json');
    var payload = {
        'from' : 'Pizza Brand' + 'mailgun@' + config.mailgun.domain,
        'to' : orderData.email,
        'subject' : 'Receipt for order #' + orderData.id,
        'text' : 'Thank you for ordering from Pizza Brand!\n Attached is your order receipt.',
        'attachment' : file
    };

    // Stringify the payload
    var payloadString = querystring.stringify(payload);

    // Create the https request options
    var requestOptions = {
        'protocol' : 'https:',
        'hostname' : 'api.mailgun.net',
        'method' : 'POST',
        'path' : '/v3/' + config.mailgun.domain + '/messages',
        'auth' : 'api:' + config.mailgun.apiKey,
        'headers' : {
            'Content-Type' : 'application/x-www-form-urlencoded',
        }
    };

    // Instantiate the https request
    var request = https.request(requestOptions, (response) => {
        var status = response.statusCode;
       
        if(status == 200 || status == 201) {
            callback(200, {"Success" : "Order completed successfully"});
        } else {
            callback(status, {"Error" : "Failed to send the receipt via email"});
        }
    });

    // Add the request payload
    request.write(payloadString);

    // Bind to errors
    request.on('error', (err) => {
        callback(err);
    });

    // Send the request
    request.end();
};

// Export the module
module.exports = billing;