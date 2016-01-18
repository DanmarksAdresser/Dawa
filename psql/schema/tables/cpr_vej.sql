DROP TABLE IF EXISTS cpr_vej CASCADE;

CREATE TABLE cpr_vej(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  navn text,
  adresseringsnavn text,
  virkning tstzrange NOT NULL,
  exclude using gist(kommunekode with =, vejkode with =, registrering with &&) INITIALLY DEFERRED
);

CREATE INDEX ON cpr_vej(kommunekode, vejkode);