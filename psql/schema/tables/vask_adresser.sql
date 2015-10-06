DROP TABLE IF EXISTS vask_adresser;
CREATE TABLE vask_adresser (
  id                 UUID,
  dar_id             INTEGER,
  adgangsadresseid   UUID,
  ap_statuskode      SMALLINT,
  hn_statuskode      SMALLINT,
  statuskode SMALLINT,
  kommunekode        SMALLINT,
  vejkode            SMALLINT,
  vejnavn            TEXT,
  husnr              husnr,
  etage              TEXT,
  doer               TEXT,
  supplerendebynavn  TEXT,
  postnr             SMALLINT,
  postnrnavn         TEXT,
  virkning           TSTZRANGE,
  EXCLUDE USING GIST (dar_id WITH =, virkning WITH &&)
);

CREATE INDEX ON vask_adresser(id);
CREATE INDEX ON vask_adresser(postnr);

