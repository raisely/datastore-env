# datastore-env

Save your environment variables in Google Cloud Datastore

## Features

* Loads variables from your Datastore into an object storing them as key value pairs
* (Optionally) Merges the variables into `process.env` to save rewriting code
* Can automatically generate a list of required variables from your `.env` file
* Fails fast when one or more required environment variables is missing from your configuration
* Creates placeholders in your datastore for missing variables so you just need fill them with the correct value
* Initialise the datastore config from an existing `.env` file

Based on [this Python Gist](https://gist.github.com/SpainTrain/6bf5896e6046a5d9e7e765d0defc8aa8)

This is useful for migrating projects that make heavy use of `.env` to Google Cloud
if you don't want to refactor code and don't want API keys, etc stored in your app.yaml

NB: If you use a `.env` file, you must still use a tool like [dotenv](https://github.com/motdotla/dotenv) to load those variables into `process.env`.

# Getting Started

```sh
npm install --save datastore-env

# Generate a list of required environment variables
npm run env -- datastore-env generate:required -i .env -o config/requiredEnv.js
```
Then in your application

```js
const DatastoreEnvironment = require('datastore-env');

// File generated above
const requiredVars = require('./config/requiredEnv.js');

const options = {
  namespace, // Namespace for datastore
  projectId, // Defaults to the value of process.env.PROJECT_ID
  path // Path to prepend to variable names when reading/writing to datastore
  required: requiredVars,
  // Default settings if a variable is missing
  defaults: {},
  requireDatastore: false, // Should an exception be raised if cannot connect to datastore (default: false)
}

const env = new DatastoreEnvironment(options);

// Load all required keys into process.env
// If some keys are not set, will throw an exception indicating which ones
// and suggest a URL to visit to set them
env.loadEnvironment();

// OR if you only want to load the settings but not merge them with process.env
const settings = env.verifyEnvironment()
```

# Generating Required Variables
The command `npm run env -- gen:required -i .env -o config/requiredEnv.js`
will generate your list of required variables that will be loaded from the
datastore settings.
This script can be used as part of a build process to automatically add new keys.
The script generates the list from a .env file

If you wish to omit some of the variables listed in .env you can put a comment on
the line before that starts with

``` sh
# optional
# datastore-env-ignore
```

To ignore all entries after a certain line, use

``` sh
# datastore-env-ignore-all
```

# Initialising your Datastore
You can initialise your datastore from a `.env` file by calling

```sh
npm run env -- datastore-env upload:env -i .env
```

This script will upload the contents of the selected `.env` file to your datastore

By default the script will NOT overwrite existing keys, and will skip any keys
marked optional in your `.env` file (using the same indicators in comments as when Generating
required variables (see above).

You can alter the behaviour by using the command line arguments `--overwrite` or
`--include-optional` respectively.

# Running Locally
There are 3 ways you can use and test this library when running locally.

1) No datastore (Simplest, but doesn't mirror production)
2) Datastore emulator (Fast, and mirrors production)
3) Connect to cloud datastore (Slow)

### No Datastore

If it is not possible to connect to datastore, datastore-env will continue without
(ie it will just use environment variables and defaults).

## Datastore emulator

You can run the Google Cloud Datastore Emulator locally:
<https://cloud.google.com/datastore/docs/tools/datastore-emulator>

## Connect to Cloud Datastore

Connect to one of your Cloud Datastore's by setting the environment variable
`GOOGLE_APPLICATION_CREDENTIALS` to the path of a json credentials file with access
to the service.

Learn more about getting a credentials file at:
<https://developers.google.com/accounts/docs/application-default-credentials>
