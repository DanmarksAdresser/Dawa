"use strict";
const _ = require('underscore');
const Promise = require('bluebird');
const {go, Channel, CLOSED, Abort} = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('darImport');

const notificationClient = require('@dawadk/dar-notification-client/src/notification-client');
const express = require('express');

const {createDarApiImporter} = require('../components/importers/dar-api');
const {executeRollbackable} = require('../components/execute');
const {EXECUTION_STRATEGY} = require('../components/common');
const moment = require('moment');

const importIncrementally = (pool, darClient, remoteEventIds, pretend) => go(function* () {
  const importer = createDarApiImporter({darClient, remoteEventIds});
  const beforeMillis = Date.now();
  yield pool.withTransaction({}, 'READ_WRITE', client => go(function* () {
    const resultContext = yield executeRollbackable(client, 'importDarApi', [importer], EXECUTION_STRATEGY.quick);
    const afterMillis = Date.now();
    const darTxTimestampMillis = resultContext['dar-api']['remote-tx-timestamp'] ?
      moment(resultContext['dar-api']['remote-tx-timestamp']).valueOf() :
      null;
    const totalRowCount = resultContext['dar-api']['total-row-count'];
    if (pretend) {
      throw new Abort('Rolling back transaction due to pretend parameter');
    } else if (!resultContext.rollback) {
      logger.info('Imported Transaction', {
        txid: resultContext.txid,
        delay: (afterMillis - darTxTimestampMillis),
        duration: (afterMillis - beforeMillis),
        totalRowCount
      });
    } else {
      logger.info('Rolling back import - nothing to import');
    }
  }));
});

const {
  ALL_DAR_ENTITIES
} = require('./import-dar-util');

const getRemoteEventIds = darClient => go(function* () {
  const remoteEventIdList = yield darClient.getEventStatus();
  if (!Array.isArray(remoteEventIdList)) {
    logger.error('Got non-array response from DAR 1.0 status');
    return;
  }
  return remoteEventIdList.reduce((memo, pair) => {
    memo[pair.entitet] = pair.eventid;
    return memo;
  }, {});
});

const importNotifications = (pool, darClient, notifications, mustUpdateAll) => go(function* () {
  if (mustUpdateAll) {
    const notificationMaxEventIds = notifications.map(notification => _.max(_.pluck(notification, 'eventid')))
    const maxEventId = _.max(notificationMaxEventIds);
    const remoteEventIds = ALL_DAR_ENTITIES.reduce((acc, entity) => {
      acc[entity] = maxEventId;
      return acc;
    }, {});
    return yield importIncrementally(pool, darClient, remoteEventIds);
  } else {
    const remoteEventIds = notifications.reduce((acc, events) => {
      for (let {entitet, eventid} of events) {
        acc[entitet] = acc[entitet] ? Math.max(acc[entitet], eventid) : eventid;
      }
      return acc;
    }, {});
    yield importIncrementally(pool, darClient, remoteEventIds);
  }
});

const takeAvailable = (ch => go(function* () {
  const result = [];
  const value = yield this.takeOrAbort(ch);
  result.push(value);
  while (result[result.length - 1] !== CLOSED && ch.canTakeSync()) {
    result.push(ch.takeSync());
  }
  return result;
}));

const importUsingStatus = (pool, darClient, pretend) => go(function* () {
  const initialRemoteEventIds = yield getRemoteEventIds(darClient);
  yield importIncrementally(pool, darClient, initialRemoteEventIds, pretend);
});

const runImportLoop = (pool, darClient, notificationWsUrl, isaliveResponseChan, {pretend}) => go(function* () {
  //start by performing a local update using the status API
  yield importUsingStatus(pool, darClient, pretend);
  isaliveResponseChan.putSync({status: 'up', usingNotifications: false});
  if (!notificationWsUrl) {
    return;
  }
  const notificationChan = new Channel(100);
  const wsClientCloseFn = notificationClient(notificationWsUrl, notificationChan);

  // Indicates whether the client should update all entities when receiving af notification.
  // This is necessary, because we may have missed some notifications initially.
  let mustUpdateAll = true;
  try {

    while (true) {
      logger.info("Waiting for DAR notifications");
      const values = yield this.delegateAbort(takeAvailable(notificationChan));
      if (values[values.length - 1] === CLOSED) {
        throw new Error("Websocket connection was closed");
      }
      const notifications = values.map(([notification, error]) => {
        if (error) {
          throw error;
        }
        return notification;
      });
      logger.info("Received DAR notifications");
      yield importNotifications(pool, darClient, notifications, mustUpdateAll);
      mustUpdateAll = false;
      isaliveResponseChan.putSync({status: 'up', usingNotifications: true});
    }
  } catch (e) {
    if(e instanceof Abort) {
      throw e;
    }
    logger.error('DAR import using notifications failed', e);
    isaliveResponseChan.putSync({
      status: 'up',
      usingNotifications: false,
      notificationFailureError: e.message
    });
  } finally {
    wsClientCloseFn();
  }
});

const createIsalive = (isaliveResponseChan, port) => go(function* () {
  let response = {status: 'unknown'};
  var isaliveApp = express();
  isaliveApp.get('/isalive', function (req, res) {
    if (response.status === 'down') {
      res.status(500);
    }
    res.json(response);
  });

  isaliveApp.set('json spaces', 2);

  const server = isaliveApp.listen(port);
  try {
    while (true) {
      response = yield this.takeOrAbort(isaliveResponseChan);
    }
  } finally {
    server.close();
  }
});

const importDaemon = (pool, darClient,
                      {pretend, noDaemon, pollIntervalMs, notificationUrl, isalivePort}) => go(function* () {
  if (!notificationUrl) {
    logger.info("Running DAR 1.0 import daemon without WebSocket listener");
  }
  if (noDaemon) {
    yield this.delegateAbort(importUsingStatus(pool, darClient));
  } else {
    const isaliveResponseChan = new Channel();
    const isaliveProcess = createIsalive(isaliveResponseChan, isalivePort);
    try {
      while (true) {
        {
          try {
            yield this.delegateAbort(runImportLoop(pool, darClient,
              notificationUrl, isaliveResponseChan, {pretend}));
          } catch (err) {
            if (err instanceof Abort) {
              throw err;
            }
            isaliveResponseChan.put({status: 'down', error: err.message});
            logger.error("Error during DAR import", err);
          }
          yield Promise.delay(pollIntervalMs);
        }
      }
    } finally {
      isaliveProcess.abort.raise("Aborting");
    }
  }
});

module.exports = {
  importDaemon
};
