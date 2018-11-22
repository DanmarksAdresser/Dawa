const { go } = require('ts-csp');
const { assignSequenceNumbersToDependentTables } = require('./table-diff');
const withImportTransaction = (client, description, sequenceNumberTables, fn) =>
  client.withTransaction('READ_WRITE', () => go(function*() {
    const txid = (yield client.query(
      `WITH id AS (SELECT COALESCE(MAX(txid), 0)+1 as txid FROM transactions),
       d AS (UPDATE current_tx SET txid = (SELECT txid FROM id))
       INSERT INTO transactions(txid, description) (select txid, $1 FROM id) RETURNING txid`, [description])).rows[0].txid;
    const result = yield fn(txid);
    yield assignSequenceNumbersToDependentTables(client, txid, sequenceNumberTables);
    yield client.query(`WITH seqs AS (SELECT txid,
                min(sequence_number) AS sekvensnummerfra,
                max(sequence_number) AS sekvensnummertil
              FROM transaction_history
              WHERE txid = ${txid}
              GROUP BY txid)
    UPDATE transactions  set sekvensnummerfra = seqs.sekvensnummerfra, sekvensnummertil = seqs.sekvensnummertil
    FROM seqs WHERE transactions.txid = seqs.txid;`);
    yield client.query(
      `INSERT INTO tx_operation_counts(txid, entity, operation, operation_count)
      (select txid, entity, operation, count(*) from transaction_history where txid = $1 group by txid, entity, operation)`, [txid]);
    yield client.query(`UPDATE current_tx SET txid=null`);
    return result;
  }));

module.exports = {
  withImportTransaction
};