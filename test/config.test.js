'use strict';

const DatastoreEnvironment = require('../lib/datastoreEnvironment');
const Datastore = require('@google-cloud/datastore');

// Instantiate a datastore client
const datastore = Datastore();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const { expect } = chai;

const placeholder = '** __ SET THIS __ **';
const required = ['DATASTORE_KEY', 'ENV_KEY', 'DEFAULT_KEY'];
const defaults = { DEFAULT_KEY: 'DEFAULT_KEY is set' };

describe('loadEnvironment', () => {
	let environment;

	after(cleanUp);

	describe('When all config is absent', () => {
		before(() => {
			environment = new DatastoreEnvironment({ required });
		});

		afterEach(cleanUp);

		const message = `3 configuration keys are missing from your
datastore or environment: ${required.join()}
Placeholders have been added to your datastore so you can edit them.
You can edit them at https://console.cloud.google.com/datastore/entities/query?project=my-project-id&kind=Env`;

		it('rejects with exception', async () =>
			expect(environment.loadEnvironment()).to.eventually
				.be.rejectedWith(message));
		it('creates placeholder variables', async () => {
			try {
				await environment.loadEnvironment();
			} catch (e) {
				// Ignore it we want to check if the
				// placeholders were put in the datastore
			}

			const promises = required.map(key =>
				checkDatastoreKey(key, placeholder));
			await Promise.all(promises);
		});
		it("doesn't load placeholder variables into environment", async () => {
			await expect(environment.loadEnvironment()).to.eventually
				.be.rejectedWith(message);

			required.forEach((key) => {
				expect(process.env[key]).to.not.eq(placeholder);
			});
		});
	});

	describe('When all config is present', () => {
		before(async () => {
			environment = await init();
			await environment.loadEnvironment();
		});

		it('Sets variable from .env', () => {
			checkKey('ENV_KEY');
		});

		it('Sets variable from datastore', () => {
			checkKey('DATASTORE_KEY');
		});

		it('Sets variable from defaults', () => {
			checkKey('DEFAULT_KEY');
		});
	});
});

describe('generateRequired', () => {

});

describe('get', () => {
	let environment;

	before(async () => {
		environment = await init();
		environment = new DatastoreEnvironment();
	});
	after(async () => {
		await cleanUp();
	});

	it('loads from environment', async () => {
		const expected = 'ENV_KEY is set';
		process.env.ENV_KEY = expected;
		const value = await environment.get('ENV_KEY');
		expect(value).to.eq(expected);
	});
	it('loads from datastore', async () => {
		const expected = 'DATASTORE_KEY is set';
		await setKey('DATASTORE_KEY', expected);
		const value = await environment.get('DATASTORE_KEY');
		expect(value).to.eq(expected);
	});
});

function checkKey(key, value) {
	// eslint-disable-next-line no-param-reassign
	value = value || `${key} is set`;
	expect(process.env[key]).to.eq(value);
}

async function checkDatastoreKey(key, value) {
	const dsKey = datastore.key(['Env', key.toUpperCase()]);
	const result = await datastore.get(dsKey);
	const actual = result[0] ? result[0].value : undefined;
	expect(actual, `${key} missing (${value})`).to.eq(value);
}

async function setKey(key, value) {
	// eslint-disable-next-line no-param-reassign
	value = value || `${key} is set`;

	const dsKey = datastore.key(['Env', key]);

	await datastore.save({ key: dsKey, data: { value } });
}

async function init() {
	process.env.ENV_KEY = 'ENV_KEY is set';
	await setKey('DATASTORE_KEY');

	const environment = new DatastoreEnvironment({
		required,
		defaults,
	});

	return environment;
}

async function cleanUp() {
	delete process.env.ENV_KEY;
	delete process.env.DATASTORE_KEY;
	delete process.env.DEFAULT_KEY;
	const keys = required.map(key => datastore.key(['Env', key]));
	await datastore.delete(keys);
}
