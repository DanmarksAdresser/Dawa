DROP TABLE IF EXISTS ejerlav CASCADE;

CREATE TABLE ejerlav (
  kode INTEGER,
  navn VARCHAR(255) NOT NULL,
  tsv tsvector,
  PRIMARY KEY(kode)
);

CREATE INDEX ejerlav_tsv ON ejerlav USING gin(tsv);
CREATE INDEX ejerlav_navn ON ejerlav(navn);

DROP TABLE IF EXISTS ejerlav_history CASCADE;

DROP TABLE IF EXISTS ejerlav_changes CASCADE;
CREATE TABLE ejerlav_changes (
  txid INTEGER NOT NULL,
  changeid INTEGER,
  operation operation_type NOT NULL,
  public boolean NOT NULL,
  kode INTEGER,
  navn VARCHAR(255) NOT NULL,
  tsv TSVECTOR
);

CREATE INDEX ON ejerlav_changes(txid);
CREATE INDEX ON ejerlav_changes(changeid);
