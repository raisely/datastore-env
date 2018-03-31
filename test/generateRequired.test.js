const execHelper = require('./util/execHelper');
const chai = require('chai');
const chaiFiles = require('chai-files');
const fs = require('fs');

chai.use(chaiFiles);

const { expect } = chai;
const { file } = chaiFiles;

const envFile = 'test/env.example';
const expectedOutput = 'test/required.example';

describe('generateRequired', () => {
	describe('call from command line', () => {
		const requireFile = 'test/.requiredFromBin.tmp';

		before(execHelper(`gen:required -i ${envFile} -o ${requireFile}`));

		itGeneratesCorrectFileContents(requireFile);

		after(() => {
			fs.unlinkSync(requireFile);
		});
	});
});

function itGeneratesCorrectFileContents(outputFile) {
	it('generates correct file contents', () => {
		expect(file(outputFile)).to.equal(file(expectedOutput));
	});
}
