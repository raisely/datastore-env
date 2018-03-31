'use strict';

const { uploadDotEnv } = require('../../index');
const minimist = require('minimist');

function runFromShell(args) {
	const argv = minimist(args);

	const options = {};

	if (argv.h || argv.help) {
		/* eslint-disable no-console */
		console.log('Generate a file exporting an array of required environment variables');
		console.log('');
		console.log('Usage');
		console.log('  datastore-env upload:env [-i <dot-env-file>] [--include-optional] [--overwrite]');
		process.exit(0);
	}

	if (argv.i) options.envFile = argv.i;
	if (argv['include-optional']) options.skipOptional = false;
	if (argv.overwrite) options.overwrite = true;

	uploadDotEnv(options)
		.catch(console.error);
}

module.exports = runFromShell;
