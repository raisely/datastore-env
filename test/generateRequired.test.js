const generateRequired = require('../lib/generateRequired');
const chai = require('chai');
const chaiFiles = require('chai-files');

chai.use(chaiFiles);

const { expect } = chai;
const { file } = chaiFiles;

const envFile = 'test/env.example';
const requireFile = 'test/.tmpRequired.test';
const expectedOutput = 'test/required.example';

describe('generateRequired', () => {
	before(() => {
		return generateRequired({ envFile, requireFile });
	});

	it('generates correct file contents', () => {
		expect(file(requireFile)).to.equal(file(expectedOutput));
	});
});
