"use strict";

const _ = require('underscore');
const Promise = require('bluebird');
const {go, Channel, CLOSED, Abort } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('darImport');

const notificationClient = require('@dawadk/dar-notification-client/src/notification-client');


const { createDarApiImporter }= require('../components/importers/dar-api');
const incrementalProcessors = require('../components/processors/incremental-processors');
const { executeIncrementally } = require('../components/processors/processor-util');
const { withImportTransaction } = require('../importUtil/transaction-util');
const moment = require('moment');

const importIncrementally = (pool, darClient, remoteEventIds, pretend) => go(function*()  {
  const importer = createDarApiImporter({darClient, remoteEventIds});
  const components = [importer, ...incrementalProcessors];
  const beforeMillis = Date.now();
  yield pool.withTransaction('READ_WRITE',
    (client) => withImportTransaction(client, "importDarApi",
      txid => go(function*() {
        const resultContext = yield executeIncrementally(client, txid, components);
        const afterMillis = Date.now();
        const darTxTimestampMillis = resultContext['dar-api']['remote-tx-timestamp'] ?
          moment(resultContext['dar-api']['remote-tx-timestamp']).valueOf() :
          null;
        const totalRowCount = resultContext['dar-api']['total-row-count'];
        if(pretend) {
          throw new Abort('Rolling back transaction due to pretend parameter');
        }
        else {
          logger.info('Imported transaction',{txid, delay: (afterMillis - darTxTimestampMillis), duration: (afterMillis - beforeMillis), totalRowCount})
        }
      })
    ));


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
  }
  else {
    const remoteEventIds = notifications.reduce((acc, events) => {
      for (let {entitet, eventid} of events) {
        acc[entitet] = acc[entitet] ? Math.max(acc[entitet], eventid) : eventid;
      }
      return acc;
    }, {});
    yield importIncrementally(pool, darClient, remoteEventIds);
  }
});

const takeAvailable = (ch => go(function*() {
  const result = [];
  const value = yield this.takeOrAbort(ch);
  result.push(value);
  while(result[result.length - 1] !== CLOSED && ch.canTakeSync()) {
    result.push(ch.takeSync());
  }
  return result;
}));

const importUsingStatus = (pool, darClient, pretend) => go(function*() {
  const initialRemoteEventIds = yield getRemoteEventIds(darClient);
  yield importIncrementally(pool, darClient, initialRemoteEventIds, pretend);
});

const runImportLoop = (pool, darClient, notificationWsUrl, {pretend}) => go(function* () {
  //start by performing a local update using the status API
  yield importUsingStatus(pool, darClient, pretend);
  if(!notificationWsUrl) {
    return;
  }
  const notificationChan = new Channel(100);
  const wsClientCloseFn = notificationClient(notificationWsUrl, notificationChan);

  // Indicates whether the client should update all entities when receiving af notification.
  // This is necessary, because we may have missed some notifications initially.
  let mustUpdateAll = true;
  try {
    while(true) {
      logger.info("Waiting for DAR notifications");
      const values  = yield this.delegateAbort(takeAvailable(notificationChan));
      if(values[values.length - 1] === CLOSED) {
        throw new Error("Websocket connection was closed");
      }
      const notifications = values.map(([notification, error]) => {
        if(error) {
          throw error;
        }
        return notification;
      });
      logger.info("Received DAR notifications");
      yield importNotifications(pool, darClient, notifications, mustUpdateAll);
      mustUpdateAll = false;
    }
  }
  finally {
    wsClientCloseFn();
  }
});

const importDaemon = (pool, darClient,
                      {pretend, noDaemon, pollIntervalMs, notificationUrl}) => go(function* () {
  if (!notificationUrl) {
    logger.info("Running DAR 1.0 import daemon without WebSocket listener");
  }

  if(noDaemon) {
    yield importUsingStatus(pool, darClient);
  }
  else {
    while(true){
      {
        try {
          yield this.delegateAbort(runImportLoop(pool, darClient, notificationUrl, {pretend}));
        }
        catch(err) {
          if(err instanceof Abort) {
            throw err;
          }
          logger.error("Error during DAR import", err);
        }
        yield Promise.delay(pollIntervalMs);
      }
    }
  }
});

module.exports = {
  importDaemon
};
