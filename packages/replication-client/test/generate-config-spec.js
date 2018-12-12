const { assert } = require('chai');

const generateConfig = require('../src/generate-config');

const replicationModel = {
  entity: {
    key: ['foo'],
    attributes: [
      {
        name: 'foo',
        type: 'integer'
      }, {
        name: 'bar',
        type: 'string'
      }
    ]
  },
  anotherentity: {
    key: ['foo'],
    attributes: [
      {
        name: 'foo',
        type: 'uuid'
      }, {
        name: 'bar',
        type: 'geometry3d'
      }, {
        name: 'baz',
        type: 'geometry'
      }
    ]
  },

};

describe('Configuration generation', () => {
  it('Can generate a configuration', () => {
    const config = generateConfig('my_url', 'my_schema', replicationModel, {});
    assert.deepEqual(config,
      {
      "replication_url": "my_url",
      "replication_schema": "my_schema",
      "entities": [
        {
          "name": "entity",
          "attributes": [
            "foo",
            "bar"
          ]
        },
        {
          "name": "anotherentity",
          "attributes": [
            "foo",
            "bar",
            "baz"
          ]
        }
      ],
      "bindings": {
        "entity": {
          "table": "entity"
        },
        "anotherentity": {
          "table": "anotherentity"
        }
      }
    });
  });

  it('Can generate a configuration for a subset of all entities', () => {
    const config = generateConfig('my_url', 'my_schema', replicationModel, {entities: ['entity']});
    assert.deepEqual(config,
      {
        "replication_url": "my_url",
        "replication_schema": "my_schema",
        "entities": [
          {
            "name": "entity",
            "attributes": [
              "foo",
              "bar"
            ]
          }
        ],
        "bindings": {
          "entity": {
            "table": "entity"
          }
        }
      });
  });
});