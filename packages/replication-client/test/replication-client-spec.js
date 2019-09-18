const {assert} = require('chai');
const {go} = require('ts-csp');
const testdb = require('@dawadk/test-util/src/testdb');
const generateConfig = require('../src/generate-config');
const replikeringModels = require('@dawadk/server/apiSpecification/replikering/datamodel');
const databaseSchemaUtil = require('../src/database-schema-util');
const {update} = require('../src/replication-client-impl');
const Promise = require("bluebird");
const {ReplicationHttpClient} = require('../src/replication-http-client');
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

const testDarConfig = generateConfig(`${baseUrl}/replikering`, "replication", replikeringModels, {});
const {normalize} = require('../src/validate-config');
const {pgMetadata} = require('../src/pg-metadata');
const testReplicationConfig = {
  replication_url: 'REPL_URL',
  replication_schema: 'replication',
  entities: [{
    name: 'test_entity',
    attributes: ['id', 'value']
  }],
  bindings: {
    "test_entity": {
      "table": "test_entity"
    }

  }
};

normalize(testDarConfig);
normalize(testReplicationConfig);

const testReplicationModels = {
  test_entity: {
    key: ['id'],
    attributes: [
      {
        name: 'id',
        type: 'integer'
      },
      {
        name: 'value',
        type: 'string'
      }
    ]
  }
};

const testClientData = {
  test_entity: [{
    txid: 1,
    operation: 'insert',
    data: {
      id: 1,
      value: 'one'
    }
  }, {
    txid: 1,
    operation: 'insert',
    data: {
      id: 2,
      value: 'two'
    }
  }, {
    txid: 2,
    operation: 'insert',
    data: {
      id: 3,
      value: 'three'
    }
  }, {
    txid: 2,
    operation: 'update',
    data: {
      id: 2,
      value: 'two updated'
    }
  }, {
    txid: 3,
    operation: 'delete',
    data: {
      id: 1,
      value: 'one'
    }
  }]
};

const applyOperation = (state, op) => {
  state = state.filter(obj => op.data.id !== obj.id);
  if (op.operation === 'insert' || op.operation === 'update') {
    state.push(op.data);
  }
  return state;
};

class FakeClient {
  constructor(data) {
    this.data = data;
  }

  lastTransaction() {
    const allOperations = Object.values(this.data).reduce((acc, arr) => acc.concat(arr), []);
    const maxTxid = allOperations.reduce((acc, op) => Math.max(acc, op.txid), 0);
    return go(function* () {
      yield Promise.delay(0);
      return {
        txid: maxTxid
      };
    });
  }

  downloadStream(entityName, remoteTxid, dstChan) {
    const ops = this.data[entityName].filter(op => op.txid <= remoteTxid);
    const resultState = ops.reduce((state, op) => applyOperation(state, op), []);
    return go(function* () {
      yield dstChan.putMany(resultState);
      dstChan.close();
    });
  }

  eventStream(entityName, txidFrom, txidTo, dstChan) {
    const events = this.data[entityName].filter(op => op.txid >= txidFrom && op.txid <= txidTo);
    return go(function* () {
      yield dstChan.putMany(events);
      dstChan.close();
    });
  }
}

const initializeSchema = (pool, config, withChangeTables) =>
  pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
    const stmts = databaseSchemaUtil.generateDDLStatements(testReplicationModels, config, {withChangeTables});
    for (let stmt of stmts) {
      yield client.query(stmt);
    }
  }));

const getPgMetadata = pool => pool.withTransaction({}, 'READ_WRITE', client => pgMetadata(client));

const initializeData = (pool, config) => go(function*() {
  yield update(pool, testReplicationModels, config, yield getPgMetadata(pool), new FakeClient(testClientData), {remoteTxid: 1});
});

for (let withChangeTables of [true, false]) {
  describe(`replikerings-klient, withChangeTables=${withChangeTables}`, () => {
    testdb.withPoolAll('replikeringtest', pool => {
      it(`Can initialize the database schema, withChangeTables=${withChangeTables}`, () => go(function* () {
        yield initializeSchema(pool, testReplicationConfig, withChangeTables);
      }));
      it(`Can initialize database, withChangeTables=${withChangeTables}`, () => go(function* () {
        yield initializeData(pool, testReplicationConfig);
        yield  pool.withTransaction({}, 'READ_WRITE', client => go(function*() {
          const result = yield client.queryRows('SELECT * FROM test_entity order by id');
          assert.strictEqual(result.length, 2);
          assert.deepStrictEqual(result[0], {id: 1, value: 'one'});
          assert.deepStrictEqual(result[1], {id: 2, value: 'two'});
        }));
      }));

      it('Has updated source_transactions table', () => go(function* () {
        yield  pool.withTransaction({}, 'READ_WRITE', client => go(function*() {
          const rows = yield client.queryRows(`select * from ${testReplicationConfig.replication_schema}.source_transactions`);
          assert.deepStrictEqual(rows[0], {
            source_txid: 1,
            local_txid: 1,
            entity: 'test_entity',
            type: 'download'
          });
        }));
      }));

      it('Can update incrementally', () => go(function* () {
        yield update(pool, testReplicationModels, testReplicationConfig,
          yield getPgMetadata(pool),
          new FakeClient(testClientData),
          {});

        yield  pool.withTransaction({}, 'READ_WRITE', client => go(function*() {
          const result = yield client.queryRows('SELECT * FROM test_entity order by id');
          assert.strictEqual(result.length, 2);
          assert.deepStrictEqual(result[0], {id: 2, value: 'two updated'});
          assert.deepStrictEqual(result[1], {id: 3, value: 'three'});
          if (withChangeTables) {
            const changes = yield client.queryRows('SELECT * FROM test_entity_changes order by id');
            assert.deepStrictEqual(changes, [
                {txid: 2, operation: 'delete', id: 1, value: 'one'},
                {txid: 2, operation: 'update', id: 2, value: 'two updated'},
                {txid: 2, operation: 'insert', id: 3, value: 'three'}
              ]
            );
          }
        }));
      }));
    });
  });
}

for (let withChangeTables of [true, false]) {
  describe(`Replikerings-klient update using download, withChangeTables=${withChangeTables}`, () => {
    testdb.withPoolAll('replikeringtest', pool => {
      it('Can update using download', () => go(function* () {
        yield initializeSchema(pool, testReplicationConfig, withChangeTables);
        yield initializeData(pool, testReplicationConfig);
        yield update(pool, testReplicationModels,
          testReplicationConfig,
          yield getPgMetadata(pool),
          new FakeClient(testClientData),
          {
            forceDownload: true,
            remoteTxid: 3
          }
        );
        yield  pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
          const result = yield client.queryRows('SELECT * FROM test_entity order by id');
          assert.strictEqual(result.length, 2);
          assert.deepStrictEqual(result[0], {id: 2, value: 'two updated'});
          assert.deepStrictEqual(result[1], {id: 3, value: 'three'});
          if (withChangeTables) {
            const changes = yield client.queryRows('select * from test_entity_changes order by id');
            assert.deepStrictEqual(changes, [
              {txid: 2, operation: 'delete', id: 1, value: 'one'},
              {txid: 2, operation: 'update', id: 2, value: 'two updated'},
              {txid: 2, operation: 'insert', id: 3, value: 'three'}
            ]);
          }
        }));
      }));
    });
  });
  describe(`Replikerings-klient column name mappings withChangeTables=${withChangeTables}`, () => {
    testdb.withPoolAll('replikeringtest', pool => {
      it('Can use column name mappings', () => go(function* () {
        const config = JSON.parse(JSON.stringify(testReplicationConfig));
        config.bindings.test_entity.attributes.value = {columnName: 'my_value'};
        yield initializeSchema(pool, config, withChangeTables);
        yield initializeData(pool, config);
        yield update(pool, testReplicationModels, config, yield getPgMetadata(pool), new FakeClient(testClientData), {});
        yield  pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
          const result = yield client.queryRows('SELECT * FROM test_entity order by id');
          assert.strictEqual(result.length, 2);
          assert.deepStrictEqual(result[0], {id: 2, my_value: 'two updated'});
          assert.deepStrictEqual(result[1], {id: 3, my_value: 'three'});
        }));
      }));
    });
  });
}

describe('replikerings-klient-integration', () => {
  testdb.withPoolAll('replikeringtest', pool => {
    it('Can initialize the database schema ', () => go(function* () {
      const stmts = databaseSchemaUtil.generateDDLStatements(replikeringModels, testDarConfig, {withChangeTables: true});
      yield  pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
        for (let stmt of stmts) {
          yield client.query(stmt);
        }
      }));
    }));
    it('Can initialize database from test server', () => go(function* () {
      const httpClient = new ReplicationHttpClient(testDarConfig.replication_url, {
        batchSize: 200,
        userAgent: 'TestReplicationClient'
      });
      yield update(pool, replikeringModels, testDarConfig, yield getPgMetadata(pool), httpClient);
    })).timeout(60000);
  });
});