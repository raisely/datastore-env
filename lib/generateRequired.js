const fs = require('fs');
const loadDotEnv = require('./loadDotEnv');

const defaultRequiredFile = 'config/requiredEnv.js';
const defaultEnvFile = '.env';

async function generateRequired(opts) {
	const options = Object.assign({
		envFile: defaultEnvFile,
		requireFile: defaultRequiredFile,
	}, opts);

	['envFile', 'requireFile'].forEach((opt) => {
		if (!options[opt]) {
			throw new Error(`You must specify options.${opt}`);
		}
	});

	// eslint-disable-next-line no-console
	console.log(`Reading environment variable names from ${options.envFile} ...`);

	return new Promise((resolve, reject) => {
		loadDotEnv(options.envFile).then((settings) => {
			const requiredVars = Object.keys(settings).filter(key => !settings[key].optional);

			requiredVars.sort();
			// eslint-disable-next-line no-console
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
				// eslint-disable-next-line no-console
				console.log('Done');
				resolve();
			});

			outFile.on('error', reject);
		});
	});
}

module.exports = generateRequired;
