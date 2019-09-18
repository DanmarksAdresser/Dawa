DROP TABLE IF EXISTS jordstykker CASCADE;

CREATE TABLE jordstykker
(
    ejerlavkode               INTEGER     NOT NULL,
    matrikelnr                TEXT        NOT NULL,
    kommunekode               SMALLINT,
    sognekode                 SMALLINT,
    regionskode               SMALLINT,
    retskredskode             SMALLINT,
    esrejendomsnr             TEXT,
    udvidet_esrejendomsnr     TEXT,
    sfeejendomsnr             TEXT,
    grund_id                  UUID,
    ejendomsrelation_id       UUID,
    bfenummer                 bigint,
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
    ejerlavnavn               TEXT,
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
CREATE INDEX ON jordstykker (bfenummer);
CREATE INDEX ON jordstykker(grund_id);
CREATE INDEX ON jordstykker(ejendomsrelation_id);


DROP TABLE IF EXISTS jordstykker_adgadr CASCADE;
CREATE TABLE jordstykker_adgadr
(
    ejerlavkode       INTEGER NOT NULL,
    matrikelnr        TEXT    NOT NULL,
    adgangsadresse_id UUID    NOT NULL,
    PRIMARY KEY (ejerlavkode, matrikelnr, adgangsadresse_id)
);

CREATE UNIQUE INDEX ON jordstykker_adgadr (adgangsadresse_id);