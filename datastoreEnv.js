#!/usr/bin/env node

'use strict';

const createRequired = require('./lib/workers/createRequiredEnv');

const command = process.argv[2];
const helperArgs = process.argv.slice(3);

switch (command) {
	case 'genRequired':
		createRequired(helperArgs);
		break;
	case 'uploadEnv':
		// uploadEnv
		break;
	default:
		/* eslint-disable no-console */
		console.log(`Unknown command: ${command}`);
		console.log('Known commands: genRequired, uploadEnv');
}
