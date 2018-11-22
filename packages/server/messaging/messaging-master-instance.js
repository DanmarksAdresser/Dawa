const cluster = require('cluster');

const messagingMaster = require('./messaging-master');

module.exports = {
  instance: messagingMaster.setup(cluster)
};
