const _ = require('underscore');
const {assert} = require('chai');
const {validateAgainstModel} = require('../src/validate-config');

const validConf = {
  replication_url: "url",
  replication_schema: "schema",
  entities: [{
    name: 'entity',
    attributes: ['foo', 'bar']
  }],
  bindings: {
    entity: {
      table: 'entity_table'
    }
  }
};

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
  }
};

describe('Replication client config validation', () => {
  it('Validates a valid configuration', () => {
    const [valid, errorText] = validateAgainstModel(replicationModel, validConf);
    assert.isNull(errorText);
    assert(valid);
  });
  it('Rejects if replication_url is missing', () => {
    const conf = _.clone(validConf);
    delete conf.replication_url;
    const [valid, errorText] = validateAgainstModel(replicationModel, conf);
    assert.isFalse(valid);
    assert(errorText);
  });
  it('Rejects if entity is not present in model', () => {
    const conf = _.clone(validConf);
    conf.entities[0].name='entity2';
    const [valid, errorText] = validateAgainstModel(replicationModel, conf);
    assert.isFalse(valid);
    assert(errorText);
  });
  it('Rejects if attribute is not present in model', () => {
    const conf = _.clone(validConf);
    conf.entities[0].attributes[0]='nonexistingattr';
    const [valid, errorText] = validateAgainstModel(replicationModel, conf);
    assert.isFalse(valid);
    assert(errorText);
  });
});