var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var fields = [
  {
    name: 'geom_json'
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
