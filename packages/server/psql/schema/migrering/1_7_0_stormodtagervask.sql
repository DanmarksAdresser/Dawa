DROP TABLE IF EXISTS vask_adgangsadresser;
CREATE TABLE vask_adgangsadresser (
  id                  UUID,
  hn_id               INTEGER,
  ap_statuskode       SMALLINT,
  hn_statuskode       SMALLINT,
  kommunekode         SMALLINT,
  vejkode             SMALLINT,
  vejnavn             TEXT,
  adresseringsvejnavn TEXT,
  husnr               husnr,
  supplerendebynavn   TEXT,
  postnr              SMALLINT,
  postnrnavn          TEXT,
  virkning            TSTZRANGE
);

CREATE INDEX ON vask_adgangsadresser (id, lower(virkning));
CREATE INDEX ON vask_adgangsadresser (postnr, id);
CREATE INDEX ON vask_adgangsadresser (kommunekode, vejkode, postnr);

DROP TABLE IF EXISTS vask_adresser;
CREATE TABLE vask_adresser (
  id                  UUID,
  dar_id              INTEGER,
  adgangsadresseid    UUID,
  ap_statuskode       SMALLINT,
  hn_statuskode       SMALLINT,
  statuskode          SMALLINT,
  kommunekode         SMALLINT,
  vejkode             SMALLINT,
  vejnavn             TEXT,
  adresseringsvejnavn TEXT,
  husnr               husnr,
  etage               TEXT,
  doer                TEXT,
  supplerendebynavn   TEXT,
  postnr              SMALLINT,
  postnrnavn          TEXT,
  virkning            TSTZRANGE
);

CREATE INDEX ON vask_adresser (id, lower(virkning));
CREATE INDEX ON vask_adresser (postnr, id);
CREATE INDEX ON vask_adresser (kommunekode, vejkode, postnr);

DROP TABLE IF EXISTS vask_adgangsadresser_unikke CASCADE;
CREATE TABLE vask_adgangsadresser_unikke (
  id                UUID,
  vejnavn           TEXT,
  husnr             husnr,
  supplerendebynavn TEXT,
  postnr            SMALLINT,
  postnrnavn        TEXT,
  tsv               TSVECTOR
);

CREATE INDEX ON vask_adgangsadresser_unikke(id);
CREATE INDEX ON vask_adgangsadresser_unikke USING GIN(tsv);

DROP TABLE IF EXISTS vask_adresser_unikke CASCADE;
CREATE TABLE vask_adresser_unikke (
  id                UUID,
  vejnavn           TEXT,
  husnr             husnr,
  etage             TEXT,
  doer              TEXT,
  supplerendebynavn TEXT,
  postnr            SMALLINT,
  postnrnavn        TEXT,
  tsv               TSVECTOR
);

CREATE INDEX ON vask_adresser_unikke(id);
CREATE INDEX ON vask_adresser_unikke USING GIN(tsv);



CREATE INDEX ON vask_vejstykker_postnumre(postnr);

