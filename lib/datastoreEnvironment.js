const Datastore = require('@google-cloud/datastore');
const _ = require('lodash');
const fs = require('fs');

const placeholder = '** __ SET THIS __ **';

class DatastoreEnvironment {
	/**
	  * @param {String[]} options.datastoreRequired If truthy, Throw an exception
	  if datastore credentials cannot be found
	  * @param {Options} options.defaults Default settings to use if a variable is not set
	  * @param {String} options.kind The kind for the datastore key (Default 'Env')
	  * @param {String} options.namespace The datastore namespace
	  * @param {String} options.placeholder The placeholder text to set when a value is missing
	  * @param {String} options.projectId Optional Google project ID
	  * @param {String[]} options.optional Optional variables, will be loaded if present, won't
	  * cause an exception if missing
	  * @param {String[]} options.required Required variables, their absence will result in an
	  * exception
	  */
	constructor(options) {
		this.options = Object.assign({
			placeholder,
			defaults: {},
			kind: 'Env',
			required: [],
			optional: [],
		}, options || {});

		const newOptions = _.pick(this.options, ['projectId']);

		if (!datastoreAvailable() && this.options.datastoreRequired) {
			throw new Error('No Datastore environment was found! (and datastoreRequired was true)');
		}

		this.datastore = new Datastore(newOptions);
	}

	/**
	  * Load all required variables into process.env
	  * @param {boolean} refresh Reload the environment if it has already been loaded (default false)
	  * @throws An exception if all required keys cannot be found in the environment,
	  * datastore or defaults
	  * @returns {Object} The values that were merged into process.env
	  */
	async loadEnvironment(refresh) {
		if (this.loadedEnvironment && !refresh) {
			return this.loadedEnvironment;
		}

		this.loadedEnvironment = this.verifyEnvironment(false);

		const values = await this.loadedEnvironment;

		Object.assign(process.env, values);
		this.loadedEnvironment = values;

		return values;
	}

	/**
	  * @throws An exception if all required keys cannot be found in the environment,
	  * datastore or defaults
	  * @returns {Object} The environment values
	  */
	async verifyEnvironment(failWithoutRequired) {
		const shouldFail = (failWithoutRequired === undefined) ? true : failWithoutRequired;

		let values = {};

		const totalKeys = this.options.required.length + this.options.optional.length;

		if (!totalKeys && shouldFail) {
			throw new Error('Cannot verify environment with no required keys specified');
		}

		values = await this.fetchAndMergeRequired();

		const missingKeys = _.difference(this.options.required, Object.keys(values));

		if (missingKeys.length > 0) {
			await this.setPlaceHolders(missingKeys);
			this.throwMissingKeys(missingKeys);
		}

		return values;
	}

	/**
	  * Get the value of a specific key from either the environment, datastore or
	  * defaults
	  * @param {String} key The key to retrieve
	  * @returns {String} The value in the setting
	  */
	async get(key) {
		const upcaseKey = key.toUpperCase();
		let value = process.env[upcaseKey];

		if (!value) {
			const dsKey = this.getDatastoreKey(key);
			const dsValue = await this.datastore.get(dsKey);
			if (dsValue[0]) {
				// eslint-disable-next-line prefer-destructuring
				value = dsValue[0].value;
			}

			if (!value) {
				value = this.options.defaults[upcaseKey];
			}
		}

		if (!value) {
			await this.setPlaceHolders([key]);
			this.throwMissingKeys([key]);
		}

		return value;
	}

	/**
	  * Find all the required keys from environment, datastore, and defaults
	  * @returns {Object} With keys containing the environment
	  */
	async fetchAndMergeRequired() {
		const allKeys = this.options.required.concat(this.options.optional);

		if (!allKeys.length) return {};

		// Env keys
		const envKeys = _.intersection(Object.keys(process.env), allKeys);
		const envValues = _.pick(process.env, envKeys);

		// Datastore values
		const datastoreKeyNames = _.difference(allKeys, envKeys);
		const datastoreKeys = this.getDatastoreKeys(datastoreKeyNames);

		const dsValues = {};
		if (datastoreAvailable() && (datastoreKeys.length)) {
			this.datastoreSetKeys = [];
			const results = await this.datastore.get(datastoreKeys);
			const rawValues = results[0];

			rawValues.forEach((value) => {
				const key = value[this.datastore.KEY].name;
				// Note that the key has been found
				this.datastoreSetKeys.push(key);
				if (value.value !== this.options.placeholder) {
					dsValues[key] = value.value;
				}
			});
		}

		const values = Object.assign({}, this.options.defaults, dsValues, envValues);

		return values;
	}

	/**
	  * Turn a key name into a complete datastore key
	  */
	getDatastoreKey(key) {
		return this.datastore.key({
			namespace: this.options.namespace,
			path: [this.options.kind, key.toUpperCase()],
		});
	}

	/**
	  * Turn an array of keys into an array of complete datastore keys
	  */
	getDatastoreKeys(keys) {
		return keys.map(key => this.getDatastoreKey(key));
	}

	/**
	  * Create keys for the missing values and set them to the placeholder value
	  * @param {String[]} Array of key names to set place holders for
	  */
	async setPlaceHolders(missingKeys) {
		if (!datastoreAvailable()) return false;
		// Only set placeholders that haven't previously been set
		const placeholders = _.difference(missingKeys, this.datastoreSetKeys)
			.map(key => ({
				key: this.getDatastoreKey(key),
				data: { value: this.options.placeholder },
			}));

		return this.datastore.insert(placeholders);
	}

	getProjectId() {
		let projectId = this.options.projectId
			|| process.env.DATASTORE_PROJECT_ID
			|| process.env.GOOGLE_CLOUD_PROJECT
			|| process.env.PROJECT;

		if (!projectId) {
			if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
				const credentials = JSON.parse(fs.readFileSync('path/test.json', 'utf8'));
				projectId = credentials.project_id;
			}
		}

		if (!projectId) throw new Error('Project ID is undefined. Try setting DATASTORE_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variables');
		return projectId;
	}

	/**
	  * @param {String[]} missingKeys The missing keys
	  * @throws An exception for the listed missing keys
	  */
	throwMissingKeys(missingKeys) {
		// Generate a URL that takes them straight to the keys they need to edit
		const base = 'https://console.cloud.google.com/datastore/entities';
		const { kind } = this.options;

		let message = `${missingKeys.length} configuration keys are missing: ${missingKeys.join()}\n`;

		if (datastoreAvailable()) {
			const project = this.getProjectId();
			let url = `${base}/query?project=${project}&kind=${kind}`;
			if (this.options.namespace) {
				url += `&ns=${this.options.namespace}`;
			}
			message += `Placeholders have been added to your datastore so you can edit them.
You can edit them at ${url}`;
		} else {
			message += 'No Datastore environment was found, so only used environment variables.\n';
			message += '(check GOOGLE_APPLICATION_CREDENTIALS environment variable if you want to use datastore)';
		}
		throw new Error(message);
	}
}

function datastoreAvailable() {
	return !!(process.env.GOOGLE_APPLICATION_CREDENTIALS
		|| process.env.DATASTORE_EMULATOR_HOST
		|| process.env.GOOGLE_CLOUD_PROJECT);
}

module.exports = DatastoreEnvironment;
