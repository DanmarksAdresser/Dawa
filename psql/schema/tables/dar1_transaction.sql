DROP TABLE IF EXISTS dar1_transaction;

CREATE TABLE dar1_transaction (
  id             INTEGER       NOT NULL PRIMARY KEY,
  ts             TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source         dar_tx_source NOT NULL--,
  --dawa_seq_range INT4RANGE     NOT NULL
);

CREATE INDEX ON dar1_transaction (ts);

DROP TABLE IF EXISTS dar1_tx_current;
CREATE TABLE dar1_tx_current (
  tx_current INTEGER
);

INSERT INTO dar1_tx_current VALUES (NULL);

CREATE UNIQUE INDEX
ON dar1_tx_current ((TRUE));

CREATE OR REPLACE FUNCTION current_dar1_transaction()
  RETURNS INTEGER
AS $$ SELECT tx_current
      FROM dar1_tx_current $$ LANGUAGE SQL;
