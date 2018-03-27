const Datastore = require('@google-cloud/datastore');
const _ = require('lodash');

const placeholder = '** __ SET THIS __ **';

class DatastoreEnvironment {
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

	async generateRequired() {

	}

	async loadEnvironment() {
		const values = await this.verifyEnvironment(false);

		Object.assign(process.env, values);

		return values;
	}

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
	  * Get the value of
	  * @param
	  */
	async get(key) {
		const upcaseKey = key.toUpperCase();
		let value = process.env[upcaseKey];

		if (!value) {
			const dsKey = this.getDatastoreKey(key);
			const dsValue = await this.datastore.get(dsKey);
			if (dsValue[0]) {
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
	  * Turn a key id into a complete datastore key
	  */
	getDatastoreKey(key) {
		return this.datastore.key({
			namespace: this.options.namespace,
			path: [this.options.kind, key.toUpperCase()],
		});
	}

	async setPlaceHolders(missingKeys) {
		const placeholders = missingKeys.map(key => ({
			key: this.getDatastoreKey(key),
			data: { value: this.options.placeholder },
		}));

		return this.datastore.insert(placeholders);
	}

	throwMissingKeys(missingKeys) {
		const base = 'https://console.cloud.google.com/datastore/entities';
		const project = this.options.projectId || process.env.DATASTORE_PROJECT_ID || process.env.project;
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
