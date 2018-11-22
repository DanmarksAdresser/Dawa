"use strict";

const q = require('q');
const WebSocket = require('ws');
const wsHeartbeats = require('ws-heartbeats');

const logger = require('@dawadk/common/src/logger');

/**
 * The sematics of this thing is a bit complex (we should probably use something like RxJS or js-csp instead).
 * @param notificationWsUrl
 * @returns {*|promise}
 */
module.exports = (notificationWsUrl) => {
  let deferred = q.defer();
  const client = {
    await: () => deferred.promise,
    unawait: () => {
      if(deferred.promise.isPending()) {
        deferred.reject('unawait');
      }
      deferred = q.defer();
    }
  };
  const runWsClient = () => {
    return q.Promise((resolve, reject) => {
      let ws = new WebSocket(notificationWsUrl);

      let dead = false;

      const die = (err) => {
        dead = true;
        reject(err);
      };
      wsHeartbeats(ws, {
        heartbeatTimeout: 30000,
        heartbeatInterval: 15000
      });

      ws.on('message', (data, flags) => {
        if(dead) {
          // ignore, to prevent duplicate responses
          return;
        }
        let notification;

        try {
          notification = JSON.parse(data);
        }
        catch(e) {
          logger.error('Received unparsable DAR notification', {data: data});
          die('Received unparsable DAR notification');
        }
        logger.info('Received DAR notification', {msg: notification});
        if(deferred.promise.isPending()) {
          deferred.resolve(notification);
        }
      });

      ws.on('close', () => {
        if(!dead) {
          die('WS connection closed');
        }
      });
      ws.on('error', (err) => {
        if(!dead) {
          die(err);
        }
      });
    });
  };

  q.async(function*() {
    /* eslint no-constant-condition: 0 */
    while(true) {
      try {
        yield runWsClient();
      }
      catch(err) {
        logger.error('Notification client died', {error: err});
      }
    }
  })();

  return client;
};
