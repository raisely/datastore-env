#!/usr/bin/env node

'use strict';

const { generateRequired } = require('./index');

const argv = require('minimist')(process.argv.slice(2));

const options = {};

if (argv.h || argv.help) {
	/* eslint-disable no-console */
	console.log('Generate a file exporting an array of required environment variables');
	console.log('');
	console.log('Usage');
	console.log('  createRequiredEnv [-i <dot-env-file>] [-o <require-file>]');
	console.log('NOTE: It will overwrite <require-file>');
	process.exit(0);
}

if (argv.i) options.envFile = argv.i;
if (argv.o) options.requireFile = argv.o;

generateRequired(options)
	.catch(console.error);
