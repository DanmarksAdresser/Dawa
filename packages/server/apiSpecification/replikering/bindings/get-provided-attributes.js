const defmulti = require('@dawadk/common/src/defmulti');

const getProvidedAttributes = defmulti((binding) => binding.type);

getProvidedAttributes.method('timestampInterval', ({attrName}) =>
  [`${attrName}start`, `${attrName}slut`]);

getProvidedAttributes.defaultMethod(({attrName}) => [attrName]);

module.exports = getProvidedAttributes;