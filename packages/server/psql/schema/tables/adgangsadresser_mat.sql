DROP TABLE IF EXISTS adgangsadresser_mat CASCADE;
CREATE TABLE adgangsadresser_mat (
  id                           UUID             NOT NULL PRIMARY KEY,
  kommunekode                  INTEGER          NOT NULL,
  vejkode                      INTEGER          NOT NULL,
  husnr                        HUSNR,
  supplerendebynavn            TEXT             NULL,
  supplerendebynavn_dagi_id    INTEGER,
  postnr                       INTEGER          NULL,
  ejerlavkode                  INTEGER,
  matrikelnr                   TEXT             NULL,
  esrejendomsnr                INTEGER          NULL,
  objekttype                   SMALLINT,
  oprettet                     TIMESTAMP,
  ikraftfra                    TIMESTAMP,
  aendret                      TIMESTAMP,
  nedlagt                      TIMESTAMP,
  adgangspunktid               UUID,
  etrs89oest                   DOUBLE PRECISION NULL,
  etrs89nord                   DOUBLE PRECISION NULL,
  noejagtighed                 CHAR(1)          NULL,
  adgangspunktkilde            SMALLINT         NULL,
  placering                    SMALLINT,
  tekniskstandard              CHAR(2)          NULL,
  tekstretning                 NUMERIC(5, 2)    NULL,
  adressepunktaendringsdato    TIMESTAMP        NULL,
  geom                         GEOMETRY(point, 25832),
  tsv                          TSVECTOR,
  hoejde                       DOUBLE PRECISION NULL,
  navngivenvej_id              UUID,
  navngivenvejkommunedel_id    UUID,
  supplerendebynavn_id         UUID,
  darkommuneinddeling_id       UUID,
  adressepunkt_id              UUID,
  postnummer_id                UUID,
  postnrnavn                   TEXT,
  vejnavn                      TEXT,
  adresseringsvejnavn          TEXT,
  ejerlavnavn                  TEXT,
  stormodtagerpostnr           SMALLINT,
  stormodtagerpostnrnavn       TEXT,
  vejpunkt_id                  UUID,
  vejpunkt_kilde               TEXT,
  vejpunkt_noejagtighedsklasse TEXT,
  vejpunkt_tekniskstandard     TEXT,
  vejpunkt_ændret              TIMESTAMP,
  vejpunkt_geom                GEOMETRY(Point, 25832)
);

CREATE INDEX ON adgangsadresser_mat USING GIST (geom);
CREATE INDEX ON adgangsadresser_mat (ejerlavkode, id);
CREATE INDEX ON adgangsadresser_mat (kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser_mat (postnr, kommunekode);
CREATE INDEX ON adgangsadresser_mat (postnr, id);
CREATE INDEX ON adgangsadresser_mat (supplerendebynavn, kommunekode, postnr);
CREATE INDEX ON adgangsadresser_mat (matrikelnr);
CREATE INDEX ON adgangsadresser_mat (husnr, id);
CREATE INDEX ON adgangsadresser_mat (esrejendomsnr);
CREATE INDEX ON adgangsadresser_mat (objekttype);
CREATE INDEX ON adgangsadresser_mat USING GIN (tsv);
CREATE INDEX ON adgangsadresser_mat (noejagtighed, id);
CREATE INDEX ON adgangsadresser_mat (navngivenvej_id, postnr);
CREATE INDEX ON adgangsadresser_mat (vejnavn, postnr);
CREATE INDEX ON adgangsadresser_mat (vejkode, postnr);
CREATE INDEX ON adgangsadresser_mat (vejpunkt_id);
CREATE INDEX ON adgangsadresser_mat USING GIST (vejpunkt_geom);
CREATE INDEX ON adgangsadresser_mat (supplerendebynavn_dagi_id);
