const fs = require('fs');
const readline = require('readline');

const defaultRequiredFile = 'config/requiredEnv.js';
const defaultEnvFile = '.env';

async function generateRequired(opts) {
	const options = Object.assign({
		envFile: defaultEnvFile,
		requiredFile: defaultRequiredFile,
	}, opts);

	const requiredVars = [];

	const lineReader = readline.createInterface({
		input: fs.createReadStream(options.envFile),
	});

	let skipNext = false;

	lineReader.on('line', (line) => {
		// Skip comments and blank lines
		if (!(line.startsWith('#') || line.trim() === '') || skipNext) {
			requiredVars.push(line.split('=')[0]);
		}

		skipNext = false;

		// Skip anything that is marked optional
		if (line.toLowerCase().startsWith('# optional')) {
			skipNext = true;
		}
	});

	lineReader.on('close', () => {
		requiredVars.sort();

		const outFile = fs.createWriteStream(options.requiredFile);

		outFile.write('module.exports = [');
		requiredVars.forEach((envVar) => {
			outFile.write(`	'${envVar}'`);
		});
		outFile.write('];');
		outFile.close();
	});
}

module.exports = generateRequired;
