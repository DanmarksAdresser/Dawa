DROP TABLE IF EXISTS vask_postnumre CASCADE;

CREATE TABLE vask_postnumre(
  nr smallint NOT NULL,
  navn text NOT NULL,
  virkning tstzrange NOT NULL
);
