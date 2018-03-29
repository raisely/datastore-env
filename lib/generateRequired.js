const fs = require('fs');
const readline = require('readline');

const defaultRequiredFile = 'config/requiredEnv.js';
const defaultEnvFile = '.env';

async function generateRequired(opts) {
	const options = Object.assign({
		envFile: defaultEnvFile,
		requireFile: defaultRequiredFile,
	}, opts);

	const requiredVars = [];

	['envFile', 'requireFile'].forEach((opt) => {
		if (!options[opt]) {
			throw new Error(`You must specify options.${opt}`);
		}
	});

	console.log(`Reading environment variable names from ${options.envFile} ...`);

	return new Promise((resolve, reject) => {

		const lineReader = readline.createInterface({
			input: fs.createReadStream(options.envFile),
		});

		let skipNext = false;

		lineReader.on('line', (line) => {
			// Skip comments and blank lines
			if (!(line.startsWith('#') || line.trim() === '' || skipNext)) {
				requiredVars.push(line.split('=')[0]);
			}

			skipNext = false;

			// Skip anything that is marked optional
			if (line.toLowerCase().startsWith('# optional')) {
				skipNext = true;
			}
		});

		lineReader.on('error', reject);

		lineReader.on('close', () => {
			requiredVars.sort();
			console.log(`Writing ${requiredVars.length} variables to ${options.requireFile} ...`);

			const outFile = fs.createWriteStream(options.requireFile);

			outFile.write('module.exports = [\n');
			requiredVars.forEach((envVar) => {
				outFile.write(`	'${envVar}',\n`);
			});
			outFile.write('];\n', () => {
				outFile.close();
			});

			outFile.on('close', () => {
				console.log('Done');
				resolve();
			});

			outFile.on('error', reject);
		});
	});
}

module.exports = generateRequired;
