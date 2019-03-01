const path = require('path');
const fs = require('fs');
const configHolder = require('../../src/config/holder');
const testConfigSchemas = configHolder.mergeConfigSchemas([
  require('../../src/config/base-schema'),
  require('../../src/config/test-db-schema'),
]);

const configFiles = [];
const testConfigFile = path.join(__dirname, '../../../../local-conf/test-conf.json5');
if(fs.existsSync(testConfigFile)) {
  configFiles.push(testConfigFile);
}
configHolder.initialize(testConfigSchemas, configFiles, {});
