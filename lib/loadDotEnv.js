'use strict';

const fs = require('fs');
const readline = require('readline');

function loadDotEnv(file) {
	const settings = {};

	return new Promise((resolve, reject) => {
		const lineReader = readline.createInterface({
			input: fs.createReadStream(file),
		});

		let skipNext = false;
		let skipAll = false;

		lineReader.on('line', (line) => {
			// Skip comments and blank lines
			if (!(line.startsWith('#') || line.trim() === '')) {
				const [name, value] = line.split(/=(.+)/);
				settings[name] = {
					value,
					optional: skipNext || skipAll,
				};
			}

			skipNext = false;

			// Skip anything that is marked optional
			if (line.toLowerCase().startsWith('# optional')
				|| line.startsWith('# datastore-env-ignore')) {
				skipNext = true;
			}

			if (line.startsWith('# datastore-env-ignore-all')) {
				skipAll = true;
			}
		});

		lineReader.on('error', reject);

		lineReader.on('close', () => {
			resolve(settings);
		});
	});
}

module.exports = loadDotEnv;
