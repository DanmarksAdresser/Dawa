const replikeringModels = require('./datamodel');
const bindings = require('./dbBindings');
const {getParameterSpec} = require('./bindings/util');

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
    // workaround spelling error maintainging backwards compatibility
    enum: [...Object.keys(replikeringModels), 'aftemningsområdetilknytning']
  },
  required: true

}];

exports.keyParameters = Object.keys(replikeringModels).reduce((memo, datamodelName) => {
  const model = replikeringModels[datamodelName];
  const binding = bindings[datamodelName];
  memo[datamodelName] = model.key.map(keyAttrName =>
    getParameterSpec(keyAttrName, model, binding));
  return memo;
}, {});