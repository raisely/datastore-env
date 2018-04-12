const loadDotEnv = require('./loadDotEnv');
const _ = require('lodash');
const DatastoreEnvironment = require('./datastoreEnvironment');

/**
  * Convenience function to upload the contents of a .env file to the datastore
  *
  * @param {String} options.envFile Path to the dot env file (Default "".env")
  * @param {boolean} options.overwrite Overwrite if values already exist (Default false)
  * @param {String} options.include 'required', 'optional', 'all'
  * (Default: optional will include optional and required)
  * @param {String} options.kind The kind for the datastore key (Default 'Env')
  * @param {String} options.namespace The datastore namespace
  * @param {String} options.projectId Optional Google project ID
  */
async function uploadDotEnv(options) {
	const opts = Object.assign({
		envFile: '.env',
		overwrite: false,
		include: 'optional',
	}, options);

	const includeVals = ['all', 'optional', 'required'];

	if (!includeVals.includes(opts.include)) {
		throw new Error(`include must be one of ${includeVals.join(',')} (was: ${opts.include})`);
	}

	// eslint-disable-next-line no-console
	console.log(`Loading settings from ${opts.envFile} ...`);
	const settings = await loadDotEnv(opts.envFile);

	let keysToSet = Object.keys(settings);

	if (opts.include !== 'all') {
		keysToSet = keysToSet.filter(key =>
			settings[key].required ||
			(settings[key].optional && opts.include === 'optional'));
	}

	const dsEnv = new DatastoreEnvironment(Object.assign({ datastoreRequired: true }, opts));

	// Keys that already exist in the datastore
	const existingKeys = [];

	// Avoid exception by first checking what already exists
	if (!opts.overwrite) {
		const keys = dsEnv.getDatastoreKeys(keysToSet);
		const results = await dsEnv.datastore.get(keys);
		const rawValues = results[0];
		rawValues.forEach((raw) => {
			if (raw) existingKeys.push(raw[dsEnv.datastore.KEY].name);
		});
	}

	const insertKeys = _.difference(keysToSet, existingKeys);

	let message = `Saving ${insertKeys.length} settings to
  Project : ${dsEnv.getProjectId()}\n`;
	if (dsEnv.options.namespace) message += `  Namespace: ${dsEnv.options.namespace}\n`;
	message += `  Kind    : ${dsEnv.options.kind}`;

	/* eslint-disable no-console */
	console.log(message);
	console.log(`including ${opts.include} keys`);

	// Save values to datastore
	console.log();
	const action = opts.overwrite ? 'save' : 'insert';
	await setKeys(dsEnv, settings, insertKeys, action);

	console.log('Done');
	/* eslint-enable no-console */
}

function setKeys(dsEnv, settings, keysToSet, action) {
	const values = keysToSet.map(key => ({
		key: dsEnv.getDatastoreKey(key),
		data: { value: settings[key].value },
	}));

	return dsEnv.datastore[action](values);
}

module.exports = uploadDotEnv;
