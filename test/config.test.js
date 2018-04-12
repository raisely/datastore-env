'use strict';

require('./testHelper');
const DatastoreEnvironment = require('../lib/datastoreEnvironment');
const Datastore = require('@google-cloud/datastore');
const _ = require('lodash');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const { expect } = chai;

const placeholder = '** __ SET THIS __ **';
const required = ['DATASTORE_KEY', 'ENV_KEY', 'DEFAULT_KEY'];
const optional = ['OPTIONAL_KEY'];
const defaults = { DEFAULT_KEY: 'DEFAULT_KEY is set' };

let datastore;

describe('loadEnvironment', () => {
	let environment;

	before(async () => {
		datastore = new Datastore();
		await cleanUp();
	});

	describe('When all config is absent', () => {
		before(() => {
			before(() => { datastore = new Datastore(); });

			environment = new DatastoreEnvironment({ required, optional });
		});

		afterEach(cleanEnv);

		const message = `3 configuration keys are missing: ${required.join()}
Placeholders have been added to your datastore so you can edit them.
You can edit them at https://console.cloud.google.com/datastore/entities/query?project=my-project-id&kind=Env`;

		it('rejects with exception', async () =>
			expect(environment.loadEnvironment()).to.eventually
				.be.rejectedWith(message));
		it('creates placeholder variables', async () => {
			try {
				await environment.loadEnvironment(true);
			} catch (e) {
				// Ignore it we want to check if the
				// placeholders were put in the datastore
			}

			const promises = required.map(key =>
				checkDatastoreKey(key, placeholder));
			await Promise.all(promises);
		});
		it("doesn't create a placeholder for optional key", async () => {
			await expect(environment.loadEnvironment(true)).to.eventually
				.be.rejectedWith(/configuration keys are missing/);

			const key = optional[0];
			const dsKey = datastore.key(['Env', key.toUpperCase()]);
			const result = await datastore.get(dsKey);
			const actual = result[0] ? result[0].value : undefined;
			expect(actual, `${key} should not have been set (${actual})`).to.be.an('undefined');
		});
		it("doesn't load placeholder variables into environment", async () => {
			await expect(environment.loadEnvironment(true)).to.eventually
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
		after(cleanUp);

		it('Sets variable from .env', () => {
			checkKey('ENV_KEY');
		});

		it('Sets variable from datastore', () => {
			checkKey('DATASTORE_KEY');
		});

		it('Sets optional variable from datastore', () => {
			checkKey('OPTIONAL_KEY');
		});

		it('Sets variable from defaults', () => {
			checkKey('DEFAULT_KEY');
		});
	});

	describe('When datastore is missing', () => {
		const googleVariables = ['GOOGLE_APPLICATION_CREDENTIALS', 'DATASTORE_EMULATOR_HOST', 'DATASTORE_PROJECT_ID'];
		let savedConfig;
		before(() => {
			savedConfig = _.pick(process.env, googleVariables);
			googleVariables.forEach(key => delete process.env[key]);
			environment = new DatastoreEnvironment({ required });
		});
		after(() => {
			Object.assign(process.env, savedConfig);
		});

		describe('datastoreRequired: false', () => {
			describe('all variables present', () => {
				before(() => {
					required.forEach((key) => {
						process.env[key] = `${key} is set`;
					});
				});

				after(cleanEnv);

				it('loads from environment', async () => {
					const config = await environment.verifyEnvironment();
					expect(config).to.have.keys(required);
				});
			});

			describe('variables missing', () => {
				before(() => {
					// Need to set a project ID or it will abort
					if (!process.env.DATASTORE_PROJECT_ID) process.env.DATASTORE_PROJECT_ID = 'my-project-id';
				});

				it('notes it in the exception', () => {
					const message = `3 configuration keys are missing: ${required.join()}
No Datastore environment was found, so only used environment variables.
(check GOOGLE_APPLICATION_CREDENTIALS environment variable if you want to use datastore)`;

					return expect(environment.loadEnvironment())
						.to.eventually.be.rejectedWith(message);
				});
			});
		});
		context('datastoreRequired: true', () => {
			after(cleanEnv);

			it('throws exception', () => {
				expect(() => new DatastoreEnvironment({ datastoreRequired: true }))
					.to.throw('No Datastore environment was found! (and datastoreRequired was true)');
			});
		});
	});
});

describe('get', () => {
	let environment;

	before(async () => {
		datastore = new Datastore();
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
	await setKey('OPTIONAL_KEY');

	const environment = new DatastoreEnvironment({
		required,
		optional,
		defaults,
	});

	return environment;
}

function cleanEnv() {
	delete process.env.ENV_KEY;
	delete process.env.DATASTORE_KEY;
	delete process.env.DEFAULT_KEY;
}

async function cleanUp() {
	cleanEnv();
	const keys = required.concat(optional).map(key => datastore.key(['Env', key]));
	await datastore.delete(keys);
}
