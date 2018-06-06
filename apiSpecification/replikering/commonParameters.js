const replikeringModels = require('./datamodel');
const bindings = require('./dbBindings');

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

exports.keyParameters = Object.keys(replikeringModels).reduce((memo, datamodelName) => {
  const model = replikeringModels[datamodelName];
  const binding = bindings[datamodelName];
  memo[datamodelName] = model.key.map(keyAttrName => {
    const bindingAttr = binding.attributes[keyAttrName];
    return {
      name: keyAttrName,
      type: bindingAttr.parameterType,
      schema: bindingAttr.parameterSchema
    };
  });
  return memo;
}, {});