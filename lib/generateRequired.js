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

	lineReader.on('line', (line) => {
		// Skip comments and blank lines
		if (!(line.startsWith('#') || line.trim() === '')) {
			requiredVars.push(line.split('=')[0]);
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
