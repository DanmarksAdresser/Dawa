DROP TABLE IF EXISTS tx_operation_counts CASCADE;
CREATE TABLE tx_operation_counts (
  txid            INTEGER        NOT NULL,
  entity          TEXT           NOT NULL,
  operation       OPERATION_TYPE NOT NULL,
  operation_count INTEGER        NOT NULL,
  PRIMARY KEY (txid, entity, operation),
  FOREIGN KEY (txid) REFERENCES transactions
);