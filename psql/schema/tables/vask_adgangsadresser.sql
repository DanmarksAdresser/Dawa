DROP TABLE IF EXISTS vask_adgangsadresser;
CREATE TABLE vask_adgangsadresser (
  id                UUID,
  hn_id             INTEGER,
  ap_statuskode     SMALLINT,
  hn_statuskode     SMALLINT,
  kommunekode       SMALLINT,
  vejkode           SMALLINT,
  vejnavn           TEXT,
  husnr             husnr,
  supplerendebynavn TEXT,
  postnr            SMALLINT,
  postnrnavn        TEXT,
  virkning          TSTZRANGE,
  tsv               TSVECTOR,
  EXCLUDE USING GIST (hn_id WITH =, virkning WITH &&)
);

CREATE INDEX ON vask_adgangsadresser (id);
CREATE INDEX ON vask_adgangsadresser (postnr);
CREATE INDEX ON vask_adgangsadresser USING gin(tsv);
