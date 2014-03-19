
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  version VARCHAR(255) NOT NULL,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL DEFAULT false
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

-- Init function
DROP FUNCTION IF EXISTS postnumre_init() CASCADE;
CREATE FUNCTION postnumre_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;
