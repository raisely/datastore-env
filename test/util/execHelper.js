'use strict';

const { exec } = require('child_process');

function execHelper(args) {
	return function runShellCommand() {
		this.timeout(10000);
		const cmdArgs = Array.isArray(args) ? args.join(' ') : args;

		return new Promise((resolve, reject) => {
			exec(`./datastoreEnv.js ${cmdArgs}`, (err, stdout, stderr) => {
				if (err) {
					reject(err);
					return;
				}

				/* eslint-disable no-console */
				console.log(stdout);
				console.log(stderr);
				/* eslint-enable no-console */
				resolve();
			});
		});
	};
}

module.exports = execHelper;
