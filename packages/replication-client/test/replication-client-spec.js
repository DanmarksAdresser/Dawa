const {assert} = require('chai');
const {go} = require('ts-csp');
const testdb = require('@dawadk/test-util/src/testdb');
const generateConfig = require('../src/generate-config');
const replikeringModels = require('@dawadk/server/apiSpecification/replikering/datamodel');
const databaseSchemaUtil = require('../src/database-schema-util');
const {update} = require('../src/replication-client-impl');
const {withReplicationTransaction} = require('../src/transactions');
const Promise = require("bluebird");
const {ReplicationHttpClient} = require('../src/replication-http-client');

const testDarConfig = generateConfig("http://localhost:3002/replikering", "replication", replikeringModels, {});
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

const initializeSchema = (client, config, withChangeTables) => go(function* () {
  const stmts = databaseSchemaUtil.generateDDLStatements(testReplicationModels, config, {withChangeTables});
  for (let stmt of stmts) {
    yield client.query(stmt);
  }
});

const initializeData = (client, config) => withReplicationTransaction(client, config.replication_schema, txid => go(function* () {
  yield update(client, txid, testReplicationModels, config, yield pgMetadata(client), new FakeClient(testClientData), {remoteTxid: 1});
}));
for(let withChangeTables of [true, false]) {
  describe(`replikerings-klient, withChangeTables=${withChangeTables}`, () => {
    testdb.withTransactionAll('replikeringtest', (clientFn) => {
      it(`Can initialize the database schema, withChangeTables=${withChangeTables}`, () => go(function* () {
        yield initializeSchema(clientFn(), testReplicationConfig, withChangeTables);
      }));
      it(`Can initialize database, withChangeTables=${withChangeTables}`, () => go(function* () {
        yield initializeData(clientFn(), testReplicationConfig);
        const result = yield clientFn().queryRows('SELECT * FROM test_entity order by id');
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result[0], {id: 1, value: 'one'});
        assert.deepStrictEqual(result[1], {id: 2, value: 'two'});
      }));

      it('Has updated source_transactions table', () => go(function* () {
        const rows = yield clientFn().queryRows(`select * from ${testReplicationConfig.replication_schema}.source_transactions`);
        assert.deepStrictEqual(rows[0], {
          source_txid: 1,
          local_txid: 1,
          entity: 'test_entity',
          type: 'download'
        });
      }));

      it('Can update incrementally', () => go(function* () {
        yield withReplicationTransaction(clientFn(), testReplicationConfig.replication_schema, txid => go(function* () {
          yield update(clientFn(), txid, testReplicationModels, testReplicationConfig,
            yield pgMetadata(clientFn()),
            new FakeClient(testClientData),
            {});
          const result = yield clientFn().queryRows('SELECT * FROM test_entity order by id');
          assert.strictEqual(result.length, 2);
          assert.deepStrictEqual(result[0], {id: 2, value: 'two updated'});
          assert.deepStrictEqual(result[1], {id: 3, value: 'three'});
          if (withChangeTables) {
            const changes = yield clientFn().queryRows('SELECT * FROM test_entity_changes order by id');
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

for(let withChangeTables of [true, false]) {
  describe(`Replikerings-klient, withChangeTables=${withChangeTables}`, () => {
    testdb.withTransactionEach('replikeringtest', (clientFn) => {
      it('Can update using download', () => go(function* () {
        yield initializeSchema(clientFn(), testReplicationConfig, withChangeTables);
        yield initializeData(clientFn(), testReplicationConfig);
        yield withReplicationTransaction(clientFn(), testReplicationConfig.replication_schema, txid => go(function* () {
          yield update(clientFn(), txid, testReplicationModels,
            testReplicationConfig,
            yield pgMetadata(clientFn()),
            new FakeClient(testClientData),
            {
              forceDownload: true,
              remoteTxid: 3
            }
          );
        }));
        const result = yield clientFn().queryRows('SELECT * FROM test_entity order by id');
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result[0], {id: 2, value: 'two updated'});
        assert.deepStrictEqual(result[1], {id: 3, value: 'three'});
        if (withChangeTables) {
          const changes = yield clientFn().queryRows('select * from test_entity_changes order by id');
          assert.deepStrictEqual(changes, [
            {txid: 2, operation: 'delete', id: 1, value: 'one'},
            {txid: 2, operation: 'update', id: 2, value: 'two updated'},
            {txid: 2, operation: 'insert', id: 3, value: 'three'}
          ]);
        }
      }));

      it('Can use column name mappings', () => go(function* () {
        const config = JSON.parse(JSON.stringify(testReplicationConfig));
        config.bindings.test_entity.attributes.value = {columnName: 'my_value'};
        yield initializeSchema(clientFn(), config, withChangeTables);
        yield initializeData(clientFn(), config);
        yield withReplicationTransaction(clientFn(), config.replication_schema, txid => go(function* () {
          yield update(clientFn(), txid, testReplicationModels, config, yield pgMetadata(clientFn()), new FakeClient(testClientData), {});
        }));
        const result = yield clientFn().queryRows('SELECT * FROM test_entity order by id');
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result[0], {id: 2, my_value: 'two updated'});
        assert.deepStrictEqual(result[1], {id: 3, my_value: 'three'});
      }));
    });
  });
}

describe('replikerings-klient-integration', () => {
  testdb.withTransactionAll('replikeringtest', (clientFn) => {
    it('Can initialize the database schema ', () => go(function* () {
      const stmts = databaseSchemaUtil.generateDDLStatements(replikeringModels, testDarConfig, {withChangeTables: true});
      for (let stmt of stmts) {
        yield clientFn().query(stmt);
      }
    }));
    it('Can initialize database from test server', () => go(function* () {
      yield withReplicationTransaction(clientFn(), testDarConfig.replication_schema, txid => go(function* () {
        const httpClient = new ReplicationHttpClient(testDarConfig.replication_url, {batchSize: 200, userAgent: 'TestReplicationClient'});
        yield update(clientFn(), txid, replikeringModels, testDarConfig,yield pgMetadata(clientFn()), httpClient );
      }));
    })).timeout(60000);
  });
});