DROP TABLE IF EXISTS postnumre CASCADE;
CREATE TABLE IF NOT EXISTS postnumre (
  nr integer NOT NULL PRIMARY KEY,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL DEFAULT false
);

CREATE INDEX ON postnumre USING gin(tsv);
CREATE INDEX ON postnumre(navn);

DROP TABLE IF EXISTS postnumre_history CASCADE;
