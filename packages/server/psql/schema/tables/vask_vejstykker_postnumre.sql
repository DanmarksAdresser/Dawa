DROP TABLE IF EXISTS vask_vejstykker_postnumre CASCADE;

CREATE TABLE vask_vejstykker_postnumre(
  kommunekode smallint NOT NULL,
  vejkode smallint NOT NULL,
  vejnavn text NOT NULL,
  postnr smallint NOT NULL,
  tekst text NOT NULL
);

CREATE INDEX ON vask_vejstykker_postnumre(kommunekode, vejkode, postnr);
CREATE INDEX ON vask_vejstykker_postnumre(postnr);