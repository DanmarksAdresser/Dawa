
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS enhedsadresser;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  version timestamp NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp NOT NULL,
  etage VARCHAR(3),
  doer VARCHAR(4),
  tsv tsvector
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
CREATE INDEX ON enhedsadresser USING gin(tsv);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

-- Init function
DROP FUNCTION IF EXISTS enhedsadresser_init() CASCADE;
CREATE FUNCTION enhedsadresser_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;
