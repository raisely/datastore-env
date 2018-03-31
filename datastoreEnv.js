#!/usr/bin/env node

'use strict';

const createRequired = require('./lib/workers/createRequiredEnv');

const command = process.argv[2];
const helperArgs = process.argv.slice(3);

switch (command) {
	case 'generate:required':
	case 'gen:required':
	case 'g:required':
		createRequired(helperArgs);
		break;
	case 'uploadEnv':
		// uploadEnv
		break;
	default:
		/* eslint-disable no-console */
		console.log(`Unknown command: ${command}`);
		console.log('Known commands: generate:required, upload:env');
}
