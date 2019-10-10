const registry = require('../registry');

module.exports = {
    singular: 'vejnavnpostnummerrelation',
    plural: 'vejnavnpostnummerrelationer',
    key: ['postnr', 'vejnavn']
};

registry.add(module.exports.singular, 'nameAndKey', undefined, module.exports);

