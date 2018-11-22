DROP TABLE IF EXISTS vask_vejnavn;

CREATE TABLE vask_vejnavn(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  navn text NOT NULL,
  adresseringsnavn text NOT NULL,
  virkning tstzrange NOT NULL,
  exclude using gist(kommunekode with =, vejkode with =, virkning with &&)
);

CREATE INDEX ON vask_vejnavn(kommunekode, vejkode);