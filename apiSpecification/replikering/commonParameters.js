const replikeringModels = require('./datamodel');

exports.sekvensnummer = [
  {
    name: 'sekvensnummer',
    type: 'integer'
  },
];

exports.txid = [
  {
    name: 'txid',
    type: 'integer'
  },
];

exports.entitet = [{
  name: 'entitet',
  type: 'string',
  schema: {
    enum: Object.keys(replikeringModels)
  },
  required: true

}];