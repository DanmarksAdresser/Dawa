"use strict";

var fs = require('fs');
var path = require('path');

module.exports = {
  toomanyconcurrentrequests : {
    status: 429
  },
  blacklisted: {
    status: 429
  }
};

Object.keys(module.exports).forEach((key) => {
  var file = path.join(__dirname, `${key}.json`);
  module.exports[key].content = fs.readFileSync(file, {encoding: 'utf8'});
});
