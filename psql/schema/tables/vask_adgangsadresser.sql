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
  virkning            TSTZRANGE,
  EXCLUDE USING GIST (hn_id WITH =, virkning WITH &&)
);

CREATE INDEX ON vask_adgangsadresser (id, lower(virkning));
CREATE INDEX ON vask_adgangsadresser (postnr, id);
CREATE INDEX ON vask_adgangsadresser (kommunekode, vejkode, postnr);
