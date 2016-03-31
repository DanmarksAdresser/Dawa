"use strict";

const generateSqlSchemaImpl = require('./generatesqlSchemaImpl');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');

const optionSpec = {
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), (args, options) => {

  /*eslint no-console: 0 */
  console.log(generateSqlSchemaImpl());
});
