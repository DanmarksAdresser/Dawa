"use strict";
const fieldsUtil = require('../../common/fieldsUtil');
const sqlModel = require('./sqlModel');
const fields = [{
  name: 'txid'
}, {
  name: 'tidspunkt'
}, {
  name: 'operationer'
}
];

fieldsUtil.applySelectability(fields, sqlModel.query);
fieldsUtil.normalize(fields);

module.exports = fields;