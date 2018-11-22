"use strict";

const _ = require('underscore');

const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  url: [false, 'API URL', 'string', 'http://services.kortforsyningen.dk/?servicename=RestGeokeys_v2&method=hoejde'],
  login: [false, 'Login til kortforsyningen', 'string', 'dawa'],
  password: [false, 'Password til kortforsyningen', 'string']
};

runImporter("højder", optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return importAdresseHeightsImpl.importFromApiDaemon(options.url, options.login, options.password);
});
