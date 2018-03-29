# datastore env

Save your environment variables in Google Cloud Datastore

## Features

* Loads variables from your Datastore into an object storing them as key value pairs
* (Optionally) Merges the variables into `process.env` to save rewriting code
* Automatically generate a list of required variables from your `.env` file
* Fails fast when one or more necessary environment variables is missing
* Creates placeholders in your datastore for missing variables so you just need fill them with the correct value

Based on [this Python Gist](https://gist.github.com/SpainTrain/6bf5896e6046a5d9e7e765d0defc8aa8)

This is useful for migrating projects that make heavy use of .env to Google Cloud
if you don't want to refactor code and don't want API keys, etc stored in your app.yaml

# Getting Started

```sh
npm install --save datastore-env

# Generate a list of required environment variables
npm run env -- create-env-require -i .env -o config/requiredEnv.js
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
The command `npm run env -- create-env-require -i .env -o config/requiredEnv.js`
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
