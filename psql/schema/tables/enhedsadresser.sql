DROP TABLE IF EXISTS enhedsadresser CASCADE;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  adgangsadresseid UUID NOT NULL,
  objekttype smallint,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  etage VARCHAR(3),
  doer VARCHAR(4),
  kilde smallint,
  esdhreference text,
  journalnummer text
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
DROP TABLE IF EXISTS enhedsadresser_history CASCADE;
