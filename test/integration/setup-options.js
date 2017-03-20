const fs = require('fs');
const path = require('path');
const config = require('../../server/config');

const optionSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config-defaults.json'), { encoding: 'utf-8'}));

const options = optionSpec.reduce((memo, option) => {
  const strValue = process.env[option.name];
  const value = option.type === 'number' ? parseInt(strValue, 10) : strValue;
  memo[option.name] = value;
  return memo;
}, {});

config.setOptions(options);
