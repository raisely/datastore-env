const generateRequired = require('./lib/generateRequired');
const DatastoreEnvironment = require('./lib/datastoreEnvironment');

DatastoreEnvironment.generateRequired = generateRequired;

module.exports = DatastoreEnvironment;
