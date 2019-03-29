DROP TABLE IF EXISTS vask_adresser;
CREATE TABLE vask_adresser
(
  rowkey              integer primary key,
  id                  UUID,
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
  virkning            TSTZRANGE,
  EXCLUDE USING GIST (id WITH =, virkning WITH &&)
);

CREATE INDEX ON vask_adresser (id, lower(virkning));
CREATE INDEX ON vask_adresser (postnr, id);
CREATE INDEX ON vask_adresser (kommunekode, vejkode, postnr);
