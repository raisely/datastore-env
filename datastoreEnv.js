#!/usr/bin/env node

'use strict';

const createRequired = require('./lib/workers/createRequiredEnv');

const action = process.argv[2];
const helperArgs = process.argv.slice(3);

switch (action) {
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
		console.log(`Unknown action: ${action}`);
		console.log('Usage:');
		console.log('    datastore-env <action> [args]');
		console.log('');
		console.log('Known commands: generate:required, upload:env');
}
