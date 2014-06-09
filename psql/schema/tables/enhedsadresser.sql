DROP TABLE IF EXISTS enhedsadresser;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  etage VARCHAR(3),
  doer VARCHAR(4),
  tsv tsvector
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
CREATE INDEX ON enhedsadresser USING gin(tsv);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

DROP TABLE IF EXISTS enhedsadresser_history;
CREATE TABLE IF NOT EXISTS enhedsadresser_history (
  valid_from integer,
  valid_to integer,
  id uuid NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamptz,
  ikraftfra timestamptz,
  aendret timestamptz,
  etage VARCHAR(3),
  doer VARCHAR(4)
);

CREATE INDEX ON enhedsadresser_history(valid_to);
CREATE INDEX ON enhedsadresser_history(valid_from);
CREATE INDEX ON enhedsadresser_history(id);