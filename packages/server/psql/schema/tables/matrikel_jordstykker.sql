DROP TABLE IF EXISTS matrikel_jordstykker CASCADE;

CREATE TABLE matrikel_jordstykker
(
  ejerlavkode               INTEGER NOT NULL,
  matrikelnr                TEXT    NOT NULL,
  kommunekode               SMALLINT,
  sognekode                 SMALLINT,
  regionskode               SMALLINT,
  retskredskode             SMALLINT,
  esrejendomsnr             TEXT,
  udvidet_esrejendomsnr     TEXT,
  sfeejendomsnr             TEXT,
  geom                      GEOMETRY(Polygon, 25832),
  featureid                 INTEGER,
  moderjordstykke           INTEGER,
  registreretareal          INTEGER,
  arealberegningsmetode     TEXT,
  vejareal                  INTEGER,
  vejarealberegningsmetode  TEXT,
  vandarealberegningsmetode TEXT,
  fælleslod                 BOOLEAN,
  PRIMARY KEY(ejerlavkode, matrikelnr),
  UNIQUE(featureid)
);
