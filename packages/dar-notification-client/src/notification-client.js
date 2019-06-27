"use strict";

const WebSocket = require('ws');
const heartbeat = require('./heartbeat');

const logger = require('@dawadk/common/src/logger').forCategory('notificationClient');


/**
 *
 * Start a DAR notification client. A websocket connection
 * will e opened, and messages will be delivered to the channel.
 * Format of delivery to channel is [message, null] for messages, and [null, error] for errors.
 * If any error happens, the channel a *single* error will be placed on the channel, and the
 * channel will be closed.
 */
module.exports = (notificationWsUrl, messageChan) => {
  let ws = new WebSocket(notificationWsUrl);
  ws.on('open', () => {
    heartbeat(ws, {
      pingTimeout: 30000,
      pingInterval: 15000
    });
  });
  let dead = false;

  const close = () => {
    if(!dead) {
      dead = true;
      messageChan.close();
      ws.close();
    }
  };
  const die = err => {
    if (!dead) {
      dead = true;
      logger.error('Closing dar notifications client due to error', err);
      messageChan.putSync([null, err]);
      messageChan.close();
    }
  };

  ws.on('message', (data) => {
    if (dead) {
      return;
    }
    try {
      const notification = JSON.parse(data);
      logger.info('Received DAR notification', {msg: notification});
      messageChan.putSync([notification, null]);
    }
    catch (e) {
      die(e);
    }
  });

  ws.on('close', (err) => {
    die(new Error('WS connection closed'));
  });

  ws.on('error', (err) => {
    die(err);
  });

  return close;
};
