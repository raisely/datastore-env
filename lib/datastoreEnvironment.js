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
			throwMissingKeys(missingKeys);
		}

		return values;
	}

	async get(key) {
		const upcaseKey = key.toUpperCase();
		let value = process.env[upcaseKey];

		if (!value) {
			const dsKey = this.getDatastoreKey(key);
			value = await this.datastore.get(dsKey);
			if (!value) {
				value = this.options.defaults[upcaseKey];
			}
		}

		if (!value) {
			await this.setPlaceHolders([key]);
			throwMissingKeys([key]);
		}

		return value;
	}

	async fetchAndMergeRequired() {
		if (!this.options.required.length) return {};

		const envKeys = _.intersection(Object.keys(process.env), this.options.required);
		const envValues = _.pick(this.env, envKeys);

		let datastoreKeys = _.difference(this.options.required, envKeys);
		datastoreKeys = datastoreKeys.map(key => this.getDatastoreKey(key));

		const dsValues = await this.datastore.get(datastoreKeys);

		return Object.assign({}, this.options.defaults, dsValues, envValues);
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
			data: this.options.placeholder,
		}));

		return this.datastore.insert(placeholders);
	}
}

function throwMissingKeys(missingKeys) {
	const message = `${missingKeys.length} configuration keys are missing from your
datastore or environment: ${missingKeys.join()}
Placeholders have been added to your datastore so you can edit them.
You can edit them at https://console.cloud.google.com/datastore`;
	throw new Error(message);
}

module.exports = DatastoreEnvironment;
