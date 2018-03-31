const execHelper = require('./util/execHelper');
const chai = require('chai');
const chaiFiles = require('chai-files');

chai.use(chaiFiles);

const { expect } = chai;
const { file } = chaiFiles;

const envFile = 'test/env.example';
const expectedOutput = 'test/required.example';

describe('generateRequired', () => {
	describe('call from command line', () => {
		const requireFile = 'test/.requiredFromBin.tmp';

		before(execHelper(`genRequired -i ${envFile} -o ${requireFile}`));

		itGeneratesCorrectFileContents(requireFile);
	});
});

function itGeneratesCorrectFileContents(outputFile) {
	it('generates correct file contents', () => {
		expect(file(outputFile)).to.equal(file(expectedOutput));
	});
}
