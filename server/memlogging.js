const logger = require('../logger');

if(process.platform !== 'win32') {
  const gc = require('gc-stats')();
  gc.on('stats', (stats) => {
    if(stats.gctype === 2) {
      const logMeta = {
        pid: process.pid,
        before: stats.before.usedHeapSize,
        after: stats.after.usedHeapSize
      };
      logger.info('memory', 'stats', logMeta);
      if(stats.after.usedHeapSize > 768 * 1024 * 1024) {
        logger.error('memory','Memory limit exceeded. Exiting process.', logMeta);
        process.exit(1);
      }
    }
  });
}
