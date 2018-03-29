const generateRequired = require('../lib/generateRequired');
const chai = require('chai');
const chaiFiles = require('chai-files');
const { exec } = require('child_process');

chai.use(chaiFiles);

const { expect } = chai;
const { file } = chaiFiles;

const envFile = 'test/env.example';
const expectedOutput = 'test/required.example';

describe('generateRequired', () => {
	describe('call from script', () => {
		const requireFile = 'test/.requiredFromScript.tmp';

		before(() => generateRequired({ envFile, requireFile }));

		itGeneratesCorrectFileContents(requireFile);
	});

	describe('call from command line', () => {
		const requireFile = 'test/.requiredFromBin.tmp';

		before((done) => {
			exec(`./createRequiredEnv.js -i ${envFile} -o ${requireFile}`, (err, stdout, stderr) => {
				if (err) {
					done(err);
				}

				/* eslint-disable no-console */
				console.log(stdout);
				console.log(stderr);
				/* eslint-enable no-console */
				done();
			});
		});

		itGeneratesCorrectFileContents(requireFile);
	});
});

function itGeneratesCorrectFileContents(outputFile) {
	it('generates correct file contents', () => {
		expect(file(outputFile)).to.equal(file(expectedOutput));
	});
}
