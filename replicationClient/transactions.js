const {go} = require('ts-csp');

const withReplikeringTransaction = (client, schema, fn) =>
  client.withTransaction('READ_WRITE', () => go(function* () {
    const txid = (yield client.queryRows(
      `WITH id AS (SELECT COALESCE(MAX(txid), 0)+1 as txid FROM ${schema}.transactions)
       INSERT INTO ${schema}.transactions(txid, ts) (select txid, NOW() FROM id) RETURNING txid`))[0].txid;
    return yield fn(txid);
  }));

module.exports = {
  withReplikeringTransaction
};