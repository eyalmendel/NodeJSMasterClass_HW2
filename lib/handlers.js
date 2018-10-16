/**
 * Requests handlers 
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const billing = require('./billing');

// Creating a container for the handlers object
var handlers = {};

// Handler for users requests
handlers.users = (data, callback) => {
    var validMethods = ['post', 'get', 'put', 'delete'];

    // Check if request method is valid
    if(validMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for users sub-methods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, email, address, password
// Optional data: none
handlers._users.post = (data, callback) => {
    // Determine all required data
    var firstName = typeof(data.payload.firstName) == 'string' &&
    data.payload.firstName.trim().length > 0
    ? data.payload.firstName
    : false;
    var lastName = typeof(data.payload.lastName) == 'string' &&
    data.payload.lastName.trim().length > 0
    ? data.payload.lastName
    : false;
    var email = typeof(data.payload.email) == 'string' 
    && helpers.isValidEmail(data.payload.email)
    ? data.payload.email
    : false;
    var address = typeof(data.payload.address) == 'string' &&
    data.payload.address.trim().length > 0
    ? data.payload.address
    : false;
    var password = typeof(data.payload.password) == 'string' &&
    data.payload.password.length > 0
    ? data.payload.password
    : false;

    if(firstName && lastName && email && address && password) {
        // Check the user doesn't already exist
        _data.read('users', email, (err, data) => {
            if(err) {
                // Hash the user password
                    var hashedPassword = helpers.hashString(password);
                    if(hashedPassword) {
                        // Build the user object
                        var userData = {
                            'firstName' : firstName,
                            'lastName' : lastName,
                            'email' : email,
                            'address' : address,
                            'password' : hashedPassword
                        };
                        // Save the user to the file system
                        _data.create('users', email, userData, (err) => {
                            if(!err) {
                                callback(200, {"Success" : "New user saved successfully"});
                            } else {
                                callback(500, {"Error" : "Could not save the new user to the file system"});
                            }
                        });
                    } else {
                        callback(500, {"Error" : "Could not hash the password"});
                    }
            } else {
                callback(400, {"Error" : "User already exist"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing or invalid required data"});
    }
};

// Users - get
// Required data: email
// Optional data: none
handlers._users.get = (data, callback) => {
    // Determine the required data
    var email = typeof(data.queryStringObject.id) == 'string'
    && helpers.isValidEmail(data.queryStringObject.email)
    ? data.queryStringObject.id
    : false;

    if(email) {
        // Check the user's token
        var token = typeof(data.headers.token) == 'string'
        ? data.headers.token
        : false;

        // Validate the token belongs to requested user
        handlers._tokens.isValidToken(token, email, (isValid) => {
            if(isValid) {
                // Get the user's data
                _data.read('users', email, (err, userData) => {
                    if(!err && userData) {
                        // Delete the user's password before sending back results
                        delete userData.password;
                        callback(200, userData);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, {"Error" : "Token is invalid or expired"});
            }
        }); 
    } else {
        callback(400, {"Error" : "Invalid email address"});
    }
};

// Users - put
// Required data: email
// Optional data: firstName, lastName, address, password (at least one)
handlers._users.put = (data, callback) => {
    // Determine the required data
    var email = typeof(data.payload.email) == 'string' 
    && helpers.isValidEmail(data.payload.email)
    ? data.payload.email
    : false;

    // Determine the optional data
    var firstName = typeof(data.payload.firstName) == 'string' &&
    data.payload.firstName.trim().length > 0
    ? data.payload.firstName
    : false;
    var lastName = typeof(data.payload.lastName) == 'string' &&
    data.payload.lastName.trim().length > 0
    ? data.payload.lastName
    : false;
    var address = typeof(data.payload.address) == 'string' &&
    data.payload.address.trim().length > 0
    ? data.payload.address
    : false;
    var password = typeof(data.payload.password) == 'string' &&
    data.payload.password.length > 0
    ? data.payload.password
    : false;

    if(email) {
        if(firstName || lastName || address || password) {
            // Verify the user's token is valid
            var token = typeof(data.headers.token) == 'string'
            ? data.headers.token
            : false;

            handlers._tokens.isValidToken(token, email, (isValid) => {
                if(isValid) {
                    // Retrieve the user's current data
                    _data.read('users', email, (err, userData) => {
                        if(!err && userData) {
                            if(firstName) {
                                userData.firstName = firstName;
                            }
                            if(lastName) {
                                userData.lastName = lastName;
                            }
                            if(address) {
                                userData.address = address;
                            }
                            if(password) {
                                var hashedPassword = helpers.hashString(password);
                                if(hashedPassword) {
                                    userData.password = hashedPassword;
                                } else {
                                    callback(500, {"Error" : "Could not hash the new password"});
                                }
                            }
                            // Save changes to file system
                            _data.update('users', email, userData, (err) => {
                                if(!err) {
                                    callback(200, {"Success" : "User updated"});
                                } else {
                                    callback(500, {"Error" : "Could not save changes to file system"});
                                }
                            })   
                        } else {
                            callback(404, {"Error" : "User doesn't exist"});
                        }
                    });
                } else {
                    callback(403, {"Error" : "User's token is invalid or expired"});
                }
            });
        } else {
            callback(400, {"Error" : "Missing optional data"});
        }
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Users - delete
// Required data: email
// Optional data: none
handlers._users.delete = (data, callback) => {
    // Determine the required data
    var email = typeof(data.queryStringObject.id) == 'string'
    && helpers.isValidEmail(data.queryStringObject.id)
    ? data.queryStringObject.id
    : false;
    
    if(email) {
        // Check the user's token
        var token = typeof(data.headers.token) == 'string'
        ? data.headers.token
        : false;

        handlers._tokens.isValidToken(token, email, (isValid) => {
            if(isValid) {
                // Remove the user from the file system
                _data.delete('users', email, (err) => {
                    if(!err) {
                        callback(200, {"Success" : "User removed from file system"});
                    } else {
                        callback(404, {"Error" : "User doesn't exist"});
                    }
                });

            } else {
                callback(403, {"Error" : "User's token is invalid or expired"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};


// Handler for tokens requests
handlers.tokens = (data, callback) => {
    var validMethods = ['post', 'get', 'put', 'delete'];

    // Check if request method is valid
    if(validMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for tokens sub-methods
handlers._tokens = {};

// Tokens - post
// Required data: email, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
    // Determine the required data
    var email = typeof(data.payload.email) == 'string' 
    && helpers.isValidEmail(data.payload.email)
    ? data.payload.email
    : false;
    var password = typeof(data.payload.password) == 'string' &&
    data.payload.password.length > 0
    ? data.payload.password
    :false;

    if(email && password) {
        // Lookup the user data
        _data.read('users', email, (err, userData) => {
            if(!err && userData) {
                // Hash the password and compare to the password in the user's data
                var hashedPassword = helpers.hashString(password);
                if(hashedPassword == userData.password) {
                    // Create the token data
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenData = {
                        'id' : tokenId,
                        'userEmail' : email,
                        'password' : hashedPassword,
                        'expires' : expires
                    };

                    // Save the new token
                    _data.create('tokens', tokenId, tokenData, (err) => {
                        if(!err) {
                            callback(200, {"Success" : "Token saved successfully"});
                        } else {
                            callback(500, {"Error" : "Could not save the new token"});
                        }
                    });
                    
                } else {
                    callback(400, {"Error" : "Could not match the given password with an existing user"});
                }
            } else {
                callback(400, {"Error" : "Could not find the specified user"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
    // Determine the required data
    var tokenId = typeof(data.queryStringObject.id) == 'string'
    && data.queryStringObject.id.length == 20
    ? data.queryStringObject.id
    :false;

    if(tokenId) {
        // Retrieve the token data
        _data.read('tokens', tokenId, (err, tokenData) => {
            if(!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404, {"Error" : "Could not find the token"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
    // Determine required data
    var tokenId = typeof(data.payload.id) == 'string'
    && data.payload.id.length == 20
    ? data.payload.id
    :false;
    var extend = typeof(data.payload.extend) == 'boolean'
    && data.payload.extend == true
    ? true
    :false;

    if(tokenId && extend) {
        // Retrieve the token data
        _data.read('tokens', tokenId, (err, tokenData) => {
            if(!err && tokenData) {
                // Check that the token didn't expire
                if(tokenData.expires > Date.now()) {
                    // Extend the token by 1 hour
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    callback(200, {"Success" : "Token extended successfully"});
                } else {
                    callback(400, {"Error" : "Couldn't extend the token, it's already expired"});
                }
            } else {
                callback(400, {"Error" : "Token doesn't exist"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
    // Determine required data
    var tokenId = typeof(data.queryStringObject.id) == 'string'
    && data.queryStringObject.id.length == 20
    ? data.queryStringObject.id
    :false;

    if(tokenId) {
        // Remove the token
        _data.delete('tokens', tokenId, (err) => {
            if(!err) {
                callback(200, {"Success" : "Token removed successfully"});
            } else {
                callback(500, {"Error" : "Could not delete the token"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Check if a token is valid
handlers._tokens.isValidToken = (token, userEmail, callback) => {
    // Check if token is a valid expression
    if(typeof(token) == 'string' && token.length > 0) {
        // Check if the token exists
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData) {
                // Check that the token matches the user's email and that it didn't expire
                if(tokenData.userEmail == userEmail && tokenData.expires > Date.now()) {
                    callback(true);
                } else {
                    callback(false);
                }
            } else {
                callback(false);
            }
        });
    } else {
        callback(false);
    }
    
};

// Check if the id belongs to the admin
handlers._tokens.isAdmin = (id, callback) => {
    // Check if id is valid
    if(typeof(id) == 'string' && id.length > 0) {
        // Check if id exists
        _data.read('.admin', id, (err, data) => {
            if(!err && data) {
                callback(true);
            } else {
                callback(false);
            }
        });
    } else {
        callback(false);
    }
};

// Handler for categories requests
handlers.categories = (data, callback) => {
    var validMethods = ['post', 'get', 'put', 'delete'];

    // Check if request method is valid
    if(validMethods.indexOf(data.method) > -1) {
        handlers._categories[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for categories sub-methods
handlers._categories = {};

// Categories - post
// Required data: name
// Optional data: none
// handlers._categories.post = (data, callback) => {
//     // Determine the required data
//     var name = typeof(data.payload.name) == 'string'
//     && data.payload.name.trim().length > 0
//     ? data.payload.name.trim()
//     : false;

//     if(name) {
//          // Get the user id from request header 
//          var id = typeof(data.headers.id) == 'string' 
//          && data.headers.id.length > 0
//          ? data.headers.id
//          : false;

//         // Check that the user is an admin
//         handlers._tokens.isAdmin(id, (isAdmin) => {
//         if(isAdmin) {
//             // Create the category object
//             var categoryData = {
//                 'name' : name
//             };

//             // Save the new category
//             _data.create('categories', name, categoryData, (err) => {
//                 if(!err) {
//                     callback(200, {"Success" : "New category saved"});
//                 } else {
//                     callback(500, {"Error" : "Couldn't save the new category"});
//                 }
//             });
//         } else {
//             callback(403, {"Error" : "Couldn't create new category. User must be an admin"});
//         }
//         });
//     } else {
//         callback(400, {"Error" : "Missing required data"});
//     }
// };

// Categories - get
// Required data: name
// Optional data: none
handlers._categories.get = (data, callback) => {
    // Determine the required data
    var name = typeof(data.queryStringObject.name) == 'string'
    && data.queryStringObject.name.trim().length > 0
    ? data.queryStringObject.name.trim()
    : false;

    if(name) {
        // Get the user token and email from request header
        var token = typeof(data.headers.token) == 'string'
        && data.headers.token.length > 0
        ? data.headers.token
        : false;
        var userEmail = typeof(data.headers.email) == 'string'
        && data.headers.email.length > 0
        ? data.headers.email
        : false;

        // Check that the token is valid
        handlers._tokens.isValidToken(token, userEmail, (isValid) => {
            if(isValid) {
                // Retrieve the category
                _data.read('categories', name, (err, data) => {
                    if(!err) {
                        callback(200, data);
                    } else {
                        callback(500, {"Error" : "Couldn't find the category"});
                    }
                });     
            } else {
                callback(403, {"Error" : "User token is invalid or expired"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Categories - put
// Required data: name
// Optional data: none
handlers._categories.put = (data, callback) => {
// Currently not needed
};

// Categories - delete
// Required data: name
// Optional data: none
handlers._categories.delete = (data, callback) => {
    // Determine the required data
    var name = typeof(data.queryStringObject.name) == 'string'
    && data.queryStringObject.name.trim().length > 0
    ? data.queryStringObject.name.trim()
    : false;

    if(name) {
        // Get the user id from request header
        var id = typeof(data.headers.id) == 'string' 
        && data.headers.id.length > 0
        ? data.headers.id
        : false;

        // Check that the user is an admin
        handlers._tokens.isAdmin(id, (isAdmin) => {
            if(isAdmin) {
                // Get the category data
                _data.read('categories', name, (err, categoryData) => {
                    if(!err && categoryData) {
                        _data.delete('categories', name, (err) => {
                            if(!err) {
                                // Delete every item associated with the category
                                var categoryItems = typeof(categoryData.items) == 'object'
                                && categoryData.items instanceof Array
                                ? categoryData.items
                                : [];
                                
                                var itemsToDelete = categoryItems.length;
                                if(itemsToDelete > 0) {
                                    var itemsDeleted = 0;
                                    var deletionErrors = false;
                                    // Loop through the items
                                    categoryItems.forEach((item) => {
                                        // Delete the item
                                        _data.delete('items', item, (err) => {
                                            if(err) {
                                                deletionErrors = true;
                                            }
                                            itemsDeleted++;
                                            if(itemsDeleted == itemsToDelete) {
                                                if(!deletionErrors) {
                                                    callback(200, {"Success" : "Category deleted successfully"});
                                                } else {
                                                    callback(500, {"Error" : "Errors encountered during deletion process"});
                                                }
                                            }
                                        });
                                    });  
                                 } else {
                                     callback(200, {"Success" : "Category deleted successfully"});
                                 }

                            } else {
                                callback(500, {"Error" : "Couldn't remove the category"});
                            }
                        });
                    } else {
                        callback(400, {"Error" : "Category not exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Couldn't delete category. User must be an admin"})
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Handler for items requests
handlers.items = (data, callback) => {
    var validMethods = ['post', 'get', 'put', 'delete'];

    // Check if request method is valid
    if(validMethods.indexOf(data.method) > -1) {
        handlers._items[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for items sub-methods
handlers._items = {};

// Items - post
// Required data: name, category, price
// Optional data: none
handlers._items.post = (data, callback) => {
    // Determine the required data
    var name = typeof(data.payload.name) == 'string'
    && data.payload.name.trim().length > 0
    ? data.payload.name.trim()
    : false;
    var category = typeof(data.payload.category) == 'string'
    && data.payload.category.trim().length > 0
    ? data.payload.category.trim()
    : false;
    var price = typeof(data.payload.price) == 'number'
    && data.payload.price > 0
    ? data.payload.price
    : false;

    if(name && category && price) {
        // Get the user id from request header
        var id = typeof(data.headers.id) == 'string'
        && data.headers.id.length > 0
        ? data.headers.id
        : false;

        // Validate that the user is an admin
        handlers._tokens.isAdmin(id, (isAdmin) => {
            if(isAdmin) {
                // Check if the category exists
                _data.read('categories', category, (err, categoryData) => {
                    if(!err && categoryData) {
                        // Get the list of items in category
                        var categoryItems = typeof(categoryData.items) == 'object'
                        && categoryData.items instanceof Array
                        ? categoryData.items
                        : [];

                        // Create the item object
                        var itemData = {
                            'name' : name,
                            'category' : category,
                            'price' : price
                        };

                        // Save the new item
                        _data.create('items', name, itemData, (err) => {
                            if(!err) {
                                // Update the category list of items
                                categoryData.items = categoryItems;
                                categoryData.items.push(name);
                                // Save the updated category
                                _data.update('categories', category, categoryData, (err) => {
                                    if(!err) {
                                        callback(200, {"Success" : "Item added successfully"});
                                    } else {
                                        callback(500, {"Error" : "Couldn't update the category with the new item"});
                                    }
                                });
                            } else {
                                callback(500, {"Error" : "Couldn't save the new item"});
                            }
                        });

                    } else {
                        callback(400, {"Error" : "Couldn't find the new item's category"});
                    }
                });

            } else {
                callback(403, {"Error" : "Couldn't create a new item. User must be an admin"});
            }
        });

    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Items - get
// Required data: name
// Optional data: none
handlers._items.get = (data, callback) => {
// Determine the required data
    var name = typeof(data.queryStringObject.name) == 'string'
    && data.queryStringObject.name.trim().length > 0
    ? data.queryStringObject.name.trim()
    : false;

    if(name) {
        // Get the user token and email from request header
        var token = typeof(data.headers.token) == 'string'
        && data.headers.token.length > 0
        ? data.headers.token
        : false;
        var userEmail = typeof(data.headers.email) == 'string'
        && data.headers.email.length > 0
        ? data.headers.email
        : false;

        // Check that the token is valid
        handlers._tokens.isValidToken(token, userEmail, (isValid) => {
            if(isValid) {
                // Retrieve the item
                _data.read('item', name, (err, data) => {
                    if(!err) {
                        callback(200, data);
                    } else {
                        callback(500, {"Error" : "Couldn't find the item"});
                    }
                });     
            } else {
                callback(403, {"Error" : "User token is invalid or expired"});
            }
        }); 
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Items - put
// Required data: name, price
// Optional data: none
handlers._items.put = (data, callback) => {
    // Determine the required data
    var name = typeof(data.payload.name) == 'string'
    && data.payload.name.trim().length > 0
    ? data.payload.name.trim()
    : false;
    var price = typeof(data.payload.price) == 'number'
    && data.payload.price > 0
    ? data.payload.price
    : false;

    if(name && price) {
        // Get the user id from request header
        var id = typeof(data.headers.id) == 'string'
        && data.headers.id.length > 0
        ? data.headers.id
        : false;

        // Validate that the user is an admin
        handlers._tokens.isAdmin(id, (isAdmin) => {
            if(isAdmin) {
                // Get the item data
                _data.read('items', name, (err, itemData) => {
                    if(!err && itemData) {
                        itemData.price = price;
                        // Save the updated item
                        _data.update('items', name, itemData, (err) => {
                            if(!err) {
                                callback(200, {"Success" : "Item updated"});
                            } else {
                                callback(500, {"Error" : "Couldn't save the updated item"});
                            }
                        });
                    } else {
                        callback(400, {"Error" : "Item doesn't exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Couldn't update the item. User must be an admin"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Items - delete
// Required data: name
// Optional data
handlers._items.delete = (data, callback) => {
    // Determine the required data
    var name = typeof(data.queryStringObject.name) == 'string'
    && data.queryStringObject.name.trim().length > 0
    ? data.queryStringObject.name.trim()
    : false;

    if(name) {
        // Get the user id from request header
        var id = typeof(data.headers.id) == 'string' 
        && data.headers.id.length > 0
        ? data.headers.id
        : false;

        // Check that the user is an admin
        handlers._tokens.isAdmin(id, (isAdmin) => {
            if(isAdmin) {
                // Get the item data
                _data.read('items', name, (err, itemData) => {
                    if(!err && itemData) {
                        // Get the item's category
                        var itemCategory = itemData.category;
                        // Delete the item
                        _data.delete('items', name, (err) => {
                            if(!err) {
                                // Get the category data
                                _data.read('categories', itemCategory, (err, categoryData) => {
                                    if(!err && categoryData) {
                                        // Remove the item from its category's list of items
                                        var categoryItems = typeof(categoryData.items) == 'object'
                                        && categoryData.items instanceof Array
                                        ? categoryData.items
                                        : [];

                                        // Remove the deleted item from the category's list of items
                                        var itemPosition = categoryItems.indexOf(name);
                                        if(itemPosition > -1) {
                                            categoryItems.splice(itemPosition, 1);
                                            categoryData.items = categoryItems;

                                            // Save the updated category
                                            _data.update('categories', itemCategory, categoryData, (err) => {
                                                if(!err) {
                                                    callback(200, {"Success" : "Item removed successfully"});
                                                } else {
                                                    callback(500, {"Error" : "Couldn't update the category"});
                                                }
                                            });
                                        } else {
                                            callback(500, {"Error" : "Couldn't find the item in the category's list of items"});
                                        }
                                    } else {
                                        callback(500, {"Error" : "Couldn't get the item's category"});
                                    }
                                });
                            } else {
                                callback(500, {"Error" : "Couldn't delete the item"});
                            }
                        });
                    } else {
                        callback(400, {"Error" : "Item doesn't exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Couldn't delete the item. User must be an admin"})
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Handler for shopping-cart requests
handlers.cart = (data, callback) => {
    var validMethods = ['get', 'put', 'delete'];

    // Check if request method is valid
    if(validMethods.indexOf(data.method) > -1) {
        handlers._cart[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for cart sub-methods
handlers._cart = {};

// Cart - get
// Required data: email
// Optional data: none
handlers._cart.get = (data, callback) => {
    // Determine the required data
    var email = typeof(data.queryStringObject.email) == 'string'
    && helpers.isValidEmail(data.queryStringObject.email)
    ? data.queryStringObject.email
    : false;

    if(email) {
        // Check the user's token
        var token = typeof(data.headers.token) == 'string'
        ? data.headers.token
        : false;

        // Validate that the token belongs to the requested user
        handlers._tokens.isValidToken(token, email, (isValid) => {
            if(isValid) {
                // Lookup the user
                _data.read('users', email, (err, userData) => {
                    if(!err && userData) {
                        // Get the user's cart
                        var cart = typeof(userData.cart) == 'object'
                        && userData.cart instanceof Array
                        ? userData.cart
                        : [];

                        callback(200, {"Cart" : cart});
                    } else {
                        callback(400, {"Error" : "User doesn't exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Token is invalid or expired"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Cart - put
// Required data: email, item, action(add/remove)
// Optional data: none
handlers._cart.put = (data, callback) => {
    // Determine the required data
    var email = typeof(data.payload.email) == 'string'
    && helpers.isValidEmail(data.payload.email)
    ? data.payload.email
    : false;
    var cartAction = typeof(data.payload.action) == 'string'
    && ['add', 'remove'].indexOf(data.payload.action) > -1
    ? data.payload.action
    : false;
    var item = typeof(data.payload.item) == 'string'
    && data.payload.item.length > 0
    ? data.payload.item
    : false;
    if(email && cartAction && item) {
        // Check the user's token
        var token = typeof(data.headers.token) == 'string'
        ? data.headers.token
        : false;

        // Validate that the token belongs to the requested user
        handlers._tokens.isValidToken(token, email, (isValid) => {
            if(isValid) {
                // Lookup the user
                _data.read('users', email, (err, userData) => {
                    if(!err && userData) {
                        // Perform the requested action on the cart
                        handlers._cart[cartAction](userData, item, (status, payload) => {
                            callback(status, payload);
                        });
                    } else {
                        callback(400, {"Error" : "User doesn't exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Token is invalid or expired"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data, or data is incorrect"});
    }
};

// Cart - delete
// Required data: email
// Optional data: none
handlers._cart.delete = (data, callback) => {
    // Determine the required data
    var email = typeof(data.queryStringObject.email) == 'string'
    && helpers.isValidEmail(data.queryStringObject.email)
    ? data.queryStringObject.email
    : false;

    if(email) {
        // Check the user's token
        var token = typeof(data.headers.token) == 'string'
        ? data.headers.token
        : false;

        // Validate that the token belongs to the requested user
        handlers._tokens.isValidToken(token, email, (isValid) => {
            if(isValid) {
                // Lookup the user
                _data.read('users', email, (err, userData) => {
                    if(!err && userData) {
                        // Clean the user's cart
                        userData.cart = [];
                        // Save the changes in user's data
                        _data.update('users', email, userData, (err) => {
                            if(!err) {
                                callback(200, {"Success" : "Shopping cart was cleared"});
                            } else {
                                callback(500, {"Error" : "Couldn't save the changes in user's shopping cart"});
                            }
                        });
                    } else {
                        callback(400, {"Error" : "User doesn't exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Token is invalid or expired"});
            }
        });
    } else {
        callback(400, {"Error" : "Missing required data"});
    }
};

// Cart - add a new item to a user's shopping cart
handlers._cart.add = (userData, item, callback) => {
    // Check that the item exists in db
    _data.read('items', item, (err, itemData) => {
        if(!err && itemData) {
            // Get the shopping cart
            var cart = typeof(userData.cart) == 'object'
            && userData.cart instanceof Array
            ? userData.cart
            : [];
            // Add the item to the user's cart
            cart.push(itemData);
            userData.cart = cart;
            // Save the changes in user's data
            _data.update('users', userData.email, userData, (err) => {
                if(!err) {
                    callback(200, {"Success" : "Item was added to shopping cart"});
                } else {
                    callback(500, {"Error" : "Couldn't save the changes in shopping cart"});
                }
            });
        } else {    
            callback(400, {"Error" : "Item doesn't exist"});
        }
    });
};

// Cart - remove an item from a user's shopping cart
handlers._cart.remove = (userData, item, callback) => {
    // Get the shopping cart
    var cart = typeof(userData.cart) == 'object'
    && userData.cart instanceof Array
    ? userData.cart
    : [];
    // Check that the item exist in user's cart
    var itemIndex = cart.findIndex(itemObject => itemObject.name == item); 
    if(itemIndex > -1) {
        // Remove the item
        cart.splice(itemIndex, 1);
        // Save the changes in user's data
        userData.cart = cart;
        _data.update('users', userData.email, userData, (err) => {
            if(!err) {
                callback(200, {"Success" : "Item removed from shopping cart"});
            } else {
                callback(500, {"Error" : "Couldn't save the changes in shopping cart"});
            }
        });
    } else {
        callback(400, {"Error" : "Item doesn't exist in user's shopping cart"});
    }
};

// Handler for order requests
handlers.orders = (data, callback) => {
    validMethods = ['post'];

    // Check if request method is valid
    if(validMethods.indexOf(data.method) > -1) {
        handlers._orders[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for orders sub-methods
handlers._orders = {};

// Order id generator
handlers._orders.nextOrderId = 0;

// Orders - post
// Required data: email, stripeToken, currency
// Optional data: none
handlers._orders.post = (data, callback) => {
    // Determine the required data
    var email = typeof(data.payload.email) == 'string'
   && helpers.isValidEmail(data.payload.email)
   ? data.payload.email
   : false;
   var stripeToken = typeof(data.payload.stripeToken) == 'string'
   && data.payload.stripeToken.length > 0
   ? data.payload.stripeToken
   : false;
   var currency = typeof(data.payload.currency) == 'string'
   && data.payload.currency.length > 0
   ? data.payload.stripeToken
   : 'usd';

   if(email && stripeToken && currency) {
        // Check the user's token
        var token = typeof(data.headers.token) == 'string'
        ? data.headers.token
        : false;

        // Validate that the token belongs to the requested user
        handlers._tokens.isValidToken(token, email, (isValid) => {
            if(isValid) {
                // Lookup the user
                _data.read('users', email, (err, userData) => {
                    if(!err && userData) {
                        // Get the user's cart
                        var cart = typeof(userData.cart) == 'object'
                        && userData.cart instanceof Array
                        ? userData.cart
                        : [];

                        if(cart.length > 0) {
                            // Calculate the total price in the shopping cart
                            var total = 0;
                            cart.forEach((item) => {
                                total += item.price;
                            });

                            // Get the order id
                            _data.read('orders', 'nextOrderId', (err, data) => {
                                if(!err && data) {
                                    var id = data.id;
                                    // Create the order object
                                    var orderData = {
                                        'id' :  id,
                                        'email' : email,
                                        'items' : cart,
                                        'total' : total,
                                        'currency' : currency,
                                        'token' : stripeToken
                                    };

                                    // Proceed to the charging process
                                    billing.chargeViaStripe(orderData, callback);
                                } else {
                                    callback(500, {"Error" : "Couldn't create the order id"});
                                }
                            });
                        } else {
                            callback(400, {"Error" : "User's shopping cart is empty"});
                        }

                    } else {
                        callback(400, {"Error" : "User doesn't exist"});
                    }
                });
            } else {
                callback(403, {"Error" : "Token is invalid or expired"});
            }
        });       
   } else {
       callback(400, {"Error" : "Missing required data"});
   }
};

// Define a "404" handler
handlers.notFound = (data, callback) => {
    callback(404, {"Error" : "Page Not Found"});
};

// Export the handlers module
module.exports = handlers;