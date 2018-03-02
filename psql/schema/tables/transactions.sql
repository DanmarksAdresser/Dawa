DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions(
  txid INTEGER PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  description text NOT NULL,
  sekvensnummerfra INTEGER,
  sekvensnummertil INTEGER
);

DROP TABLE IF EXISTS current_tx;
CREATE TABLE current_tx(
  txid INTEGER
);

INSERT INTO current_tx VALUES (null);
CREATE UNIQUE INDEX
  ON current_tx((true));
