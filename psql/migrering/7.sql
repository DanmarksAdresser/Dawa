

\set ECHO queries
\set ON_ERROR_STOP on

\echo '\n***** Add stormodtagere'

BEGIN;

ALTER TABLE postnumre DROP COLUMN IF EXISTS stormodtager;
ALTER TABLE IF EXISTS postnumre ADD COLUMN stormodtager boolean NOT NULL DEFAULT false;

DROP TABLE IF EXISTS stormodtagere;
CREATE TABLE IF NOT EXISTS stormodtagere (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  adgangsadresseid UUID NOT NULL
);

COMMIT;
