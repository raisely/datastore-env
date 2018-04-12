const fs = require('fs');
const loadDotEnv = require('./loadDotEnv');
const _ = require('lodash');

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

	const writeToConsole = options.requireFile === '-';

	// eslint-disable-next-line no-console
	const log = writeToConsole ? _.noop : console.log;

	log(`Reading environment variable names from ${options.envFile} ...`);

	return new Promise((resolve, reject) => {
		loadDotEnv(options.envFile).then((settings) => {
			const requiredVars = Object.keys(settings).filter(key => settings[key].required);
			const optionalVars = Object.keys(settings).filter(key => settings[key].optional);

			requiredVars.sort();
			optionalVars.sort();

			log(`Writing ${requiredVars.length} variables (${requiredVars.length} required, ${optionalVars.length} optional) to ${options.requireFile} ...`);

			const outFile = writeToConsole ?
				process.stdout :
				fs.createWriteStream(options.requireFile);

			outFile.write('module.exports = {\n');
			outFile.write('	required: [\n');
			requiredVars.forEach((envVar) => {
				outFile.write(`		'${envVar}',\n`);
			});
			outFile.write('	],\n');
			outFile.write('	optional: [\n');
			optionalVars.forEach((envVar) => {
				outFile.write(`		'${envVar}',\n`);
			});
			outFile.write('	],\n');
			outFile.write('};\n', () => {
				if (!writeToConsole) outFile.close();
			});

			outFile.on('close', () => {
				log('Done');
				resolve();
			});

			outFile.on('error', reject);
		});
	});
}

module.exports = generateRequired;
