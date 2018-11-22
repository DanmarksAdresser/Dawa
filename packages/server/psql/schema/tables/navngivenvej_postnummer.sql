DROP TABLE IF EXISTS navngivenvej_postnummer CASCADE;
CREATE TABLE navngivenvej_postnummer (
  id              UUID PRIMARY KEY,
  postnummer_id   UUID     NOT NULL,
  navngivenvej_id UUID     NOT NULL,
  postnr          SMALLINT NOT NULL,
  tekst           TEXT     NOT NULL
);

CREATE UNIQUE INDEX ON navngivenvej_postnummer (navngivenvej_id, postnr);
CREATE INDEX ON navngivenvej_postnummer (postnummer_id);
