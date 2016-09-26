DROP TABLE IF EXISTS navngivenvej_postnummer CASCADE;
CREATE TABLE navngivenvej_postnummer(
  navngivenvej_id uuid NOT NULL,
  postnr smallint NOT NULL,
  tekst text NOT NULL,
  PRIMARY KEY(navngivenvej_id, postnr)
);
