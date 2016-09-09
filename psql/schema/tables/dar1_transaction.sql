DROP TABLE IF EXISTS dar1_transaction CASCADE;

CREATE TABLE dar1_transaction (
  id             INTEGER       NOT NULL PRIMARY KEY,
  ts             TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source         text NOT NULL,
  dawa_seq_range INT4RANGE     NOT NULL
);

CREATE INDEX ON dar1_transaction (ts);

DROP TABLE IF EXISTS dar1_meta;

CREATE TABLE dar1_meta(
  current_tx INTEGER, -- ID of currently executing transaction
  last_event_id INTEGER, -- Last event id which has been fetched and stored
  virkning timestamptz, -- Current virkning time for computing actual state for DAWA tables
  prev_virkning timestamptz -- Previous virkning time for computing actual state for DAWA tables
);

INSERT INTO dar1_meta VALUES(NULL, NULL, NULL);

CREATE UNIQUE INDEX
ON dar1_meta ((TRUE));

DROP TABLE IF EXISTS dar1_tx_current CASCADE;
DROP TABLE IF EXISTS dar1_curtime CASCADE;
DROP TABLE IF EXISTS dar1_eventid CASCADE;
