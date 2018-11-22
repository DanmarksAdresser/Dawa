"use strict";

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const _ = require('underscore');

const logger = require('@dawadk/common/src/logger').forCategory("notifications");
const notificationsImpl = require('./notificationsImpl');

const optionSpec = {
  listenPort: [false, 'TCP port der lyttes på', 'number', 3000]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  const server = notificationsImpl.createNotificationApp();
  server.listen(options.listenPort, function () {
    logger.info(`Notification service listening on port ${options.listenPort}`);
  });
});
