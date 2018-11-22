"use strict";

const Promise = require('bluebird');
const {go} = require('ts-csp');

const databasePools = require('@dawadk/common/src/postgres/database-pools');
const logger = require('@dawadk/common/src/logger').forCategory('isalive');

const isAliveWorker = server => go(function*() {
  const connectionCount = yield Promise.promisify(server.getConnections, {context: server})();
  let couldPerformQuery = false;
  try {
    yield databasePools.get('prod').withConnection({}, client => go(function*() {
      const rows = yield client.queryRows('select * from adgangsadresser limit 1');
      if (rows.length !== 1) {
        throw new Error('No rows from adgangsadresser');
      }
      couldPerformQuery = true;
    }));
  }
  catch (err) {
    logger.error('Isalive query failed', err);
  }
  const poolStatus = databasePools.get('prod').getPoolStatus();
  const status = couldPerformQuery ? 'up' : 'down';
  return {
    type: 'status',
    data: {
      status,
      postgresPool: poolStatus,
      connections: connectionCount
    }
  }
});

const setup = (server) => {
  process.on('message', message => go(function*() {
    try {
      if (message.type === 'getStatus') {
        const result = yield isAliveWorker(server);
        result.requestId = message.requestId;
        process.send(result);
      }
    }
    catch (err) {
      logger.error('isalive', 'Unexpected error during isalive', err);
    }
  }));
};

module.exports = {
  setup
};
