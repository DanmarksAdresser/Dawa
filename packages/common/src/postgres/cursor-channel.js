"use strict";

const {go, OperationType, Abort} = require('ts-csp');
const { into } = require('transducers-js');
const DEFAULT_FETCH_SIZE = 200;
const configHolder = require('@dawadk/common/src/config/holder');
const logger = require('@dawadk/common/src/logger').forCategory('Database');

/**
 * Start a process which opens a cursor and repeatedly FETCH rows and
 * put them on a channel.
 * Note that in the case of an error, no assumptions
 * can be made about the state of the connection
 * @returns {*}
 */
module.exports = (client, sql, params, channel, options) => {
  return go(function*() {
    options = options || {};
    const fetchSize = options.fetchSize || DEFAULT_FETCH_SIZE;
    const keepOpen = options.keepOpen ? true : false;
    const cursorSql = `declare c1 NO SCROLL cursor for ${sql}`;
    let totalRows = 0;
    const config = configHolder.getConfig();
    let error = null;
    // we skip SQL logging for queries by the cursor, because the cursor aggregates all the FETCH statements into a
    // single log statement in the end.
    let  [, totalTime] = yield this.delegateAbort(client.queryWithTiming(cursorSql, params, {skipSqlLogging: true}));
    try {
      /* eslint no-constant-condition: 0 */
      while (true) {
        const [result, timeTaken] = (yield this.delegateAbort(
            client.queryWithTiming(`FETCH ${fetchSize} FROM c1`, [], {skipSqlLogging: true})));
        let rows = result.rows;
        totalRows += rows.length;
        totalTime += timeTaken;
        if(rows.length > 0)  {
          if(options.xform) {
            rows = into([], options.xform, rows);
          }
          yield this.selectOrAbort(
            [{ch: channel, op: OperationType.PUT_MANY, values: rows}]);
        }
        if (rows.length < fetchSize) {
          if(!keepOpen) {
            channel.close();
          }
          yield client.query(`CLOSE c1`, [], { skipQueue: true, skipSqlLogging: true });
          break;
        }
      }
    }
    catch(err) {
      if(err instanceof Abort) {
        // regular abort. Just close the cursor and abort.
        yield client.query(`CLOSE c1`, [], { skipQueue: true, skipSqlLogging: true });
      }
      else {
        error = err;
      }
      throw err;
    }
    finally {
      const shouldLog = error || (config.get('logging.log_sql') && totalTime > config.get('logging.log_sql_threshold'));
      if(shouldLog) {
        const level = error ? 'error' : 'info';
        logger.log(level, 'sql', {
          sql,
          params,
          rows: totalRows,
          queryTime: totalTime,
          error,
        });
      }
    }
  });
};
