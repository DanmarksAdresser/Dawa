const logger = require('@dawadk/common/src/logger').forCategory('notificationClient');
module.exports = function socketTimeout (webSocketClient, options) {

  options = Object.assign({}, {
    heartbeatTimeout: 30000,
    heartbeatInterval: 10000
  }, options);

  let pingNotReceivedTimeout;
  let schedulePingTimeout;

  setPingTimeout();
  schedulePing();

  ['message', 'pong'].forEach(function (evt) {
    webSocketClient.on(evt, function () {
      schedulePing();
      setPingTimeout();
    });
  });

  function schedulePing() {
    clearTimeout(schedulePingTimeout);
    schedulePingTimeout = setTimeout(function () {
      webSocketClient.ping();
      schedulePing();
    }, options.heartbeatInterval);
  }

  function setPingTimeout() {
    clearTimeout(pingNotReceivedTimeout);
    pingNotReceivedTimeout = setTimeout(function () {
      logger.error('Closing websocket, no heartbeat');
      webSocketClient.close();
      tearDownTimers();
    }, options.heartbeatInterval + options.heartbeatTimeout);
  }

  function tearDownTimers() {
    clearTimeout(schedulePingTimeout);
    clearTimeout(pingNotReceivedTimeout);
  }

  webSocketClient.on('close', tearDownTimers);
};