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
create index on vask_adgangsadresser(kommunekode, vejkode, postnr);

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
  tsv               TSVECTOR,
  EXCLUDE USING GIST (dar_id WITH =, virkning WITH &&)
);

CREATE INDEX ON vask_adresser(id);
CREATE INDEX ON vask_adresser(postnr);
CREATE INDEX ON vask_adresser USING gin(tsv);
create index on vask_adresser(kommunekode, vejkode, postnr);
