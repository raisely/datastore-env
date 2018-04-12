'use strict';

const fs = require('fs');
const readline = require('readline');

/**
  * Load the contents of the dot env file, creating a map from keys to information on each key
  * For each key is an object of the form:
  * {
  *		value, // The value of the key
  *		optional, // If the key is optional
  *		skip, // The key should be ignored entirely (not even include among optional keys)
  *		required, // The key is always required
  * }
  * @param {String} file The name of the file to load
  * @returns {Object} Maps from keys to the object describing the key
  */
function loadDotEnv(file) {
	const settings = {};

	return new Promise((resolve, reject) => {
		const lineReader = readline.createInterface({
			input: fs.createReadStream(file),
		});

		let optional = false;
		let skipNext = false;
		let skipAll = false;

		lineReader.on('line', (line) => {
			// Skip comments and blank lines
			if (!(line.startsWith('#') || line.trim() === '')) {
				const [name, value] = line.split(/=(.+)/);
				settings[name] = {
					value,
					optional,
					skip: skipNext || skipAll,
					required: !(optional || skipNext || skipAll),
				};
			} else {
				// Skip anything that is marked optional
				optional = line.toLowerCase().startsWith('# optional');
				skipNext = line.startsWith('# datastore-env-ignore');
				skipAll = line.startsWith('# datastore-env-ignore-all');
			}
		});

		lineReader.on('error', reject);

		lineReader.on('close', () => {
			resolve(settings);
		});
	});
}

module.exports = loadDotEnv;
