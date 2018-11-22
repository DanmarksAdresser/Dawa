DROP TABLE IF EXISTS jordstykker CASCADE;

CREATE TABLE jordstykker (
  ejerlavkode               INTEGER     NOT NULL,
  ejerlavnavn               TEXT,
  matrikelnr                TEXT        NOT NULL,
  kommunekode               SMALLINT,
  sognekode                 SMALLINT,
  regionskode               SMALLINT,
  retskredskode             SMALLINT,
  esrejendomsnr             TEXT,
  udvidet_esrejendomsnr     TEXT,
  sfeejendomsnr             TEXT,
  ændret                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo_version               INTEGER     NOT NULL DEFAULT 1,
  geo_ændret                TIMESTAMPTZ NOT NULL DEFAULT now(),
  geom                      GEOMETRY(Polygon, 25832),
  bbox                      GEOMETRY(Polygon, 25832),
  visueltcenter             GEOMETRY(Point, 25832),
  featureid                 INTEGER,
  moderjordstykke           INTEGER,
  registreretareal          INTEGER,
  arealberegningsmetode     TEXT,
  vejareal                  INTEGER,
  vejarealberegningsmetode  TEXT,
  vandarealberegningsmetode TEXT,
  fælleslod                 BOOLEAN,
  tsv                       TSVECTOR,
  PRIMARY KEY (ejerlavkode, matrikelnr)
);

CREATE INDEX ON jordstykker (matrikelnr);
CREATE INDEX ON jordstykker (kommunekode);
CREATE INDEX ON jordstykker (sognekode);
CREATE INDEX ON jordstykker (retskredskode);
CREATE INDEX ON jordstykker (esrejendomsnr);
CREATE INDEX ON jordstykker (udvidet_esrejendomsnr);
CREATE INDEX ON jordstykker (sfeejendomsnr);
CREATE INDEX ON jordstykker (featureid);
CREATE INDEX ON jordstykker USING GIST (geom);
CREATE INDEX ON jordstykker USING GIN (tsv);

DROP TABLE IF EXISTS jordstykker_changes CASCADE;
CREATE TABLE jordstykker_changes AS (SELECT
                                       NULL :: INTEGER        AS txid,
                                       NULL :: INTEGER        AS changeid,
                                       NULL :: OPERATION_TYPE AS operation,
                                       NULL :: BOOLEAN        AS public,
                                       jordstykker.*
                                     FROM jordstykker
                                     WHERE FALSE);
CREATE INDEX ON jordstykker_changes (ejerlavkode, matrikelnr, changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_changes (ejerlavkode, matrikelnr);
CREATE INDEX ON jordstykker_changes (changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_changes (txid);


DROP TABLE IF EXISTS jordstykker_adgadr CASCADE;
CREATE TABLE jordstykker_adgadr (
  ejerlavkode       INTEGER NOT NULL,
  matrikelnr        TEXT    NOT NULL,
  adgangsadresse_id UUID    NOT NULL,
  PRIMARY KEY (ejerlavkode, matrikelnr, adgangsadresse_id)
);

CREATE UNIQUE INDEX ON jordstykker_adgadr (adgangsadresse_id);

DROP TABLE IF EXISTS jordstykker_adgadr_history CASCADE;

DROP TABLE IF EXISTS jordstykker_adgadr_changes CASCADE;
CREATE TABLE jordstykker_adgadr_changes AS (SELECT
                                              NULL :: INTEGER        AS txid,
                                              NULL :: INTEGER        AS changeid,
                                              NULL :: OPERATION_TYPE AS operation,
                                              NULL :: BOOLEAN        AS public,
                                              adgangsadresse_id,
                                              ejerlavkode,
                                              matrikelnr
                                            FROM jordstykker_adgadr
                                            WHERE FALSE);
CREATE INDEX ON jordstykker_adgadr_changes (adgangsadresse_id, ejerlavkode, matrikelnr, changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_adgadr_changes (ejerlavkode, matrikelnr);
CREATE INDEX ON jordstykker_adgadr_changes (changeid DESC NULLS LAST);
CREATE INDEX ON jordstykker_adgadr_changes (txid);

CREATE VIEW jordstykker_adgadr_view AS (
  (SELECT DISTINCT
     j.ejerlavkode,
     j.matrikelnr,
     a.id AS adgangsadresse_id
   FROM adgangsadresser_mat a
     JOIN jordstykker j ON ST_Covers(j.geom, a.geom)));