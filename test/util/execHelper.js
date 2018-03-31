'use strict';

const { exec } = require('child_process');

function execHelper(args) {
	return function runShellCommand(done) {
		this.timeout(10000);

		const cmdArgs = Array.isArray(args) ? args.join(' ') : args;

		exec(`./datastoreEnv.js ${cmdArgs}`, (err, stdout, stderr) => {
			if (err) {
				done(err);
				return;
			}

			/* eslint-disable no-console */
			console.log(stdout);
			console.log(stderr);
			/* eslint-enable no-console */
			done();
		});
	};
}

module.exports = execHelper;
