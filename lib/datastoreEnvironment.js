const Datastore = require('@google-cloud/datastore');
const _ = require('lodash');

const placeholder = '** __ SET THIS __ **';

class DatastoreEnvironment {
	/**
	  * @param {Options} options.defaults Default settings to use if a variable is not set
	  * @param {String} options.kind The kind for the datastore key (Default 'Env')
	  * @param {String} options.namespace The datastore namespace
	  * @param {String} options.placeholder The placeholder text to set when a value is missing
	  * @param {String} options.projectId Optional Google project ID
	  * @param {String[]} options.required Required variables, their absence will result in an
	  * exception
	  */
	constructor(options) {
		this.options = Object.assign({
			placeholder,
			defaults: {},
			kind: 'Env',
			required: [],
		}, options || {});

		const newOptions = _.pick(this.options, ['projectId']);

		this.datastore = new Datastore(newOptions);
	}

	/**
	  * Load all required variables into process.env
	  * @throws An exception if all required keys cannot be found in the environment,
	  * datastore or defaults
	  * @returns {Object} The values that were merged into process.env
	  */
	async loadEnvironment() {
		const values = await this.verifyEnvironment(false);

		Object.assign(process.env, values);

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

		if (!this.options.required.length && shouldFail) {
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
		if (!this.options.required.length) return {};

		// Env keys
		const envKeys = _.intersection(Object.keys(process.env), this.options.required);
		const envValues = _.pick(process.env, envKeys);

		// Datastore values
		const datastoreKeyNames = _.difference(this.options.required, envKeys);
		const datastoreKeys = datastoreKeyNames.map(key => this.getDatastoreKey(key));

		const dsValues = {};
		if (datastoreKeys.length) {
			const results = await this.datastore.get(datastoreKeys);
			const rawValues = results[0];
			_.forEach(datastoreKeyNames, (key, index) => {
				if (rawValues[index]) {
					dsValues[key] = rawValues[index].value;
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
	  * Create keys for the missing values and set them to the placeholder value
	  * @param {String[]} Array of key names to set place holders for
	  */
	async setPlaceHolders(missingKeys) {
		const placeholders = missingKeys.map(key => ({
			key: this.getDatastoreKey(key),
			data: { value: this.options.placeholder },
		}));

		return this.datastore.insert(placeholders);
	}

	/**
	  * @param {String[]} missingKeys The missing keys
	  * @throws An exception for the listed missing keys
	  */
	throwMissingKeys(missingKeys) {
		// Generate a URL that takes them straight to the keys they need to edit
		const base = 'https://console.cloud.google.com/datastore/entities';
		const project = this.options.projectId
			|| process.env.DATASTORE_PROJECT_ID
			|| process.env.PROJECT;
		const { kind } = this.options;

		let url = `${base}/query?project=${project}&kind=${kind}`;
		if (this.options.namespace) {
			url += `&ns=${this.options.namespace}`;
		}
		const message = `${missingKeys.length} configuration keys are missing from your
datastore or environment: ${missingKeys.join()}
Placeholders have been added to your datastore so you can edit them.
You can edit them at ${url}`;
		throw new Error(message);
	}
}

module.exports = DatastoreEnvironment;
