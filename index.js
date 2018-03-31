const generateRequired = require('./lib/generateRequired');
const uploadDotEnv = require('./lib/uploadDotEnv');
const DatastoreEnvironment = require('./lib/datastoreEnvironment');

DatastoreEnvironment.generateRequired = generateRequired;
DatastoreEnvironment.uploadDotEnv = uploadDotEnv;

module.exports = DatastoreEnvironment;
