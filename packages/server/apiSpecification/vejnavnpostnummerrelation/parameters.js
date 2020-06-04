const registry = require('../registry');

const schema = require('../parameterSchema');
module.exports = {
    id: [
        {
            name: 'postnr',
            type: 'integer'
        },
        {
            name: 'vejnavn',
            type: 'string'
        }
    ],
    propertyFilter: [
        {
            name: 'postnr',
            type: 'integer',
            schema: schema.postnr
        },
        {
            name: 'vejnavn',
            type: 'string'
        },
        {
            name: 'kommunekode',
            type: 'integer',
            schema: schema.kode4,
            multi: true
        }
        ]
};


registry.addMultiple('vejnavnpostnummerrelation', 'parameterGroup', module.exports);
