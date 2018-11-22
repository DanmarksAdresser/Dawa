DROP TABLE IF EXISTS dar1_transaction CASCADE;

DROP TABLE IF EXISTS dar1_meta CASCADE;

CREATE TABLE dar1_meta(
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
