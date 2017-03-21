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

DROP TABLE IF EXISTS postnumre_changes CASCADE;
CREATE TABLE postnumre_changes(
  txid INTEGER NOT NULL,
  changeid INTEGER,
  operation operation_type NOT NULL,
  public boolean NOT NULL,
  nr integer NOT NULL PRIMARY KEY,
  navn VARCHAR(20) NOT NULL,
  tsv tsvector,
  stormodtager boolean NOT NULL
);

CREATE INDEX ON postnumre_changes(txid);
CREATE INDEX ON postnumre_changes(changeid);
CREATE INDEX ON postnumre_changes(nr);
