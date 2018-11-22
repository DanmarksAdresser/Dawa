DROP TABLE IF EXISTS stormodtagere CASCADE;
CREATE TABLE IF NOT EXISTS stormodtagere (
  nr integer NOT NULL,
  navn VARCHAR(20) NOT NULL,
  adgangsadresseid UUID NOT NULL PRIMARY KEY
);
