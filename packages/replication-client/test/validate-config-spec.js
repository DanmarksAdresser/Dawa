const _ = require('underscore');
const { go } = require('ts-csp');
const {assert} = require('chai');
const {validateAgainstModel, normalize, validateAgainstDatabase} = require('../src/validate-config');
const testdb = require('@dawadk/test-util/src/testdb');
const databaseSchemaUtil = require('../src/database-schema-util');

const validConf = () => normalize({
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
});


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
    const [valid, errorText] = validateAgainstModel(replicationModel, validConf());
    assert.isNull(errorText);
    assert(valid);
  });
  it('Rejects if replication_url is missing', () => {
    const conf = validConf()
    delete conf.replication_url;
    const [valid, errorText] = validateAgainstModel(replicationModel, conf);
    assert.isFalse(valid);
    assert(errorText);
  });
  it('Rejects if entity is not present in model', () => {
    const conf = validConf()
    conf.entities[0].name='entity2';
    const [valid, errorText] = validateAgainstModel(replicationModel, conf);
    assert.isFalse(valid);
    assert(errorText);
  });
  it('Rejects if attribute is not present in model', () => {
    const conf = validConf()
    conf.entities[0].attributes[0]='nonexistingattr';
    const [valid, errorText] = validateAgainstModel(replicationModel, conf);
    assert.isFalse(valid);
    assert(errorText);
  });

  describe('Validation against database', () => {
    testdb.withTransactionAll('replikeringtest', (clientFn) => {

      const loadSchema = () => go(function*() {
        const stmts = databaseSchemaUtil.generateDDLStatements(replicationModel, validConf());
        for (let stmt of stmts) {
          yield clientFn().query(stmt);
        }
      });

      it('Validates generated schema', () => go(function* () {
        yield loadSchema();
        const [valid] = yield validateAgainstDatabase(clientFn(), validConf());
        assert(valid);
      }));

      it('Rejects if table not found', () => go(function*() {
        yield loadSchema();
        const conf = validConf();
        conf.bindings.entity.table = 'differenttable';
        const [valid, errorText] = yield validateAgainstDatabase(clientFn(), conf);
        assert.isFalse(valid);
        assert.strictEqual(errorText, "Database missing table public.differenttable for entity entity");
      }));
      it('Rejects if column not found', () => go(function*() {
        yield loadSchema();
        const conf = validConf();
        conf.bindings.entity.attributes.foo.columnName = 'foospecified';
        const [valid, errorText] = yield validateAgainstDatabase(clientFn(), conf);
        assert.isFalse(valid);
        assert.strictEqual(errorText, "Database missing column foospecified for attribute foo of table public.entity_table for entity entity");
      }));
    });
  });
});