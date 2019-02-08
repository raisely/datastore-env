'use strict';

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

before(configEnvironment);

/**
  * This allows for tests to still pass
  */
function configEnvironment() {
	let found = false;
	const datastoreKeys = ['GOOGLE_APPLICATION_CREDENTIALS', 'DATASTORE_EMULATOR_HOST'];

	datastoreKeys.forEach((key) => { found = found || process.env[key]; });

	if (!found) {
		throw new Error(`No Google Datastore environment found.
Expected it to be defined by one of these environment variables:
	${datastoreKeys.join(',')}
A datastore is needed for testing. To install the datastore emultator, visit:
	https://cloud.google.com/datastore/docs/tools/datastore-emulator
To run the emulator, run
	npm run datastore`);
	}

	if (!process.env.DATASTORE_PROJECT_ID) process.env.DATASTORE_PROJECT_ID = 'my-project-id';
}
