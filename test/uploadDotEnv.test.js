'use strict';

require('./testHelper');
const execHelper = require('./util/execHelper');
const chai = require('chai');
const chaiFiles = require('chai-files');
const Datastore = require('@google-cloud/datastore');
const _ = require('lodash');

chai.use(chaiFiles);

const { expect } = chai;

const allEnvValues = {
	FAVORITE_COLOR: 'blue',
	SERVER_URL: 'http://test.example/?a=1',
	DEV_ONLY_VAR: '1',
	API_KEY: 'a secret',
	NOT_THIS_ONE: 'true',
	OR_THIS_ONE: 'completely',
};

const requiredKeys = ['API_KEY', 'SERVER_URL'];
const optionalKeys = ['FAVORITE_COLOR'];

const envFile = 'test/env.example';

let datastore;

describe('upload:env', () => {
	before(() => { datastore = new Datastore(); });

	afterEach(clearKeys);

	describe('skip optional', () => {
		before(execHelper(`upload:env -i ${envFile} --include=required`));

		itWritesCorrectValues(requiredKeys);
	});

	describe('include all', () => {
		before(execHelper(`upload:env -i ${envFile} --include=all`));

		itWritesCorrectValues(Object.keys(allEnvValues));
	});

	describe('include optional', () => {
		before(execHelper(`upload:env -i ${envFile}`));

		itWritesCorrectValues(requiredKeys.concat(optionalKeys));
	});

	describe('overwrite existing', () => {
		before(async function setupOverwrite() {
			await setKey('API_KEY', 'so not the correct value');

			return execHelper(`upload:env -i ${envFile} --overwrite`).apply(this);
		});

		itWritesCorrectValues(requiredKeys);
	});

	describe("doesn't overwrite existing", () => {
		const value = 'do not touch!';
		before(async function setupNoOverwrite() {
			await setKey('API_KEY', value);

			return execHelper(`upload:env -i ${envFile}`).apply(this);
		});

		itWritesCorrectValues(requiredKeys, {
			API_KEY: value,
		});
	});
});

function itWritesCorrectValues(keys, values) {
	it('saves all keys and values', async () => {
		const expected = Object.assign({}, _.pick(allEnvValues, keys), values || {});

		const dsKeys = keys.map(key => datastore.key(['Env', key.toUpperCase()]));
		const result = await datastore.get(dsKeys);

		const raw = result[0];
		const actual = {};

		raw.forEach((value) => {
			const key = value[datastore.KEY].name;
			actual[key] = value.value;
		});

		expect(actual).to.deep.eq(expected);
	});
}

async function clearKeys() {
	const keys = Object.keys(allEnvValues).map(key => datastore.key(['Env', key]));

	await datastore.delete(keys);
}

async function setKey(key, value) {
	// eslint-disable-next-line no-param-reassign
	value = value || `${key} is set`;

	const dsKey = datastore.key(['Env', key]);

	await datastore.save({ key: dsKey, data: { value } });
}
