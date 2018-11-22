"use strict";

const logger = require('@dawadk/common/src/logger').forCategory('sql');

module.exports = logMessage => {
  if(logMessage.error) {
    logger.error('SQL query error', logMessage);
  }
};
