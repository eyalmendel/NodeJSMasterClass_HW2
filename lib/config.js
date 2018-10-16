/**
 * Create configurations for possible environments and export only the relevant
 */

// Create a container for possible environments
var environments = {};

// Define the staging envrionment (will be used as default)
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashKey' : 'thisIsMyHashKey',
    'stripe' : {
        'publicKey' : 'pk_test_6CxcM8cQfxJktiOh5yEMcXcE',
        'privateKey' : 'sk_test_efGmIzZVL1iqH88xzjhrcuBU'
    },
    'mailgun' : {
        'apiKey' : '4c6ced76ac0cdaf4f1f488bbc50609df-bd350f28-0e5102ca',
        'domain' : 'sandboxd04cb7741e854796b7c14ca14b613d0d.mailgun.org'
    }
};

// Define the production envrionment
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashKey' : 'thisIsMyProductionHashKey',
    'stripe' : {
        'publicKey' : 'live-public-key',
        'privateKey' : 'live-private-key'
    },
    'mailgun' : {
        'apiKey' : '4c6ced76ac0cdaf4f1f488bbc50609df-bd350f28-0e5102ca',
        'domain' : 'MYDOMAIN.com'
    }
};

// Determine the requested environment
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string'
? process.env.NODE_ENV.toLowerCase()
: '';

// Check that the requested environment is valid, otherwise default to 'staging'
var environmentToExport = typeof(environments[currentEnvironment]) == 'object'
? environments[currentEnvironment]
: environments.staging;

// Export the relevant configuration
module.exports = environmentToExport;
