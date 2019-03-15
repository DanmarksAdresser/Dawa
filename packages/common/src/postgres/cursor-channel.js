"use strict";

const {go, OperationType, Abort} = require('ts-csp');
const { into } = require('transducers-js');
const DEFAULT_FETCH_SIZE = 200;

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
    yield this.delegateAbort(client.query(cursorSql, params));
    try {
      /* eslint no-constant-condition: 0 */
      while (true) {
        let rows = (yield this.delegateAbort(
          client.query(`FETCH ${fetchSize} FROM c1`))).rows || [];
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
          yield client.query(`CLOSE c1`, [], { skipQueue: true });
          break;
        }
      }
    }
    catch(err) {
      if(err instanceof Abort) {
        // regular abort. Just close the cursor and abort.
        yield client.query(`CLOSE c1`, [], { skipQueue: true });
      }
      throw err;
    }
  });
};
