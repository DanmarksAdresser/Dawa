"use strict";

const generateSqlSchemaImpl = require('./generateSqlSchemaImpl');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');

const optionSpec = {
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), (args, options) => {

  /*eslint no-console: 0 */
  console.log(generateSqlSchemaImpl);
});
