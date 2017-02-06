"use strict";

const logger = require('../logger').forCategory('sql');

module.exports = logMessage => {
  if(logMessage.error) {
    logger.error('SQL query error', logMessage);
  }
};
