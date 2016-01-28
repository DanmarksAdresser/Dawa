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
