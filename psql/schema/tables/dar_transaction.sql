DROP TYPE IF EXISTS dar_tx_source CASCADE;

CREATE TYPE dar_tx_source AS ENUM('csv', 'api');

DROP TABLE IF EXISTS dar_transaction;

CREATE TABLE dar_transaction(
id integer NOT NULL PRIMARY KEY,
ts timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
dawa_seq_range int4range NOT NULL);

CREATE INDEX ON dar_transaction(ts);

DROP TABLE IF EXISTS dar_tx_current;
CREATE TABLE dar_tx_current(
  tx_current integer
);

INSERT INTO dar_tx_current VALUES (NULL);

CREATE UNIQUE INDEX
ON dar_tx_current((true));

CREATE OR REPLACE FUNCTION current_dar_transaction() RETURNS INTEGER
AS $$ SELECT tx_current FROM dar_tx_current $$ LANGUAGE SQL;
