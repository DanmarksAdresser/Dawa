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
