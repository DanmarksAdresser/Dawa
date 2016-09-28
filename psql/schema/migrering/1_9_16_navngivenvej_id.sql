ALTER TABLE adgangsadresser ADD COLUMN navngivenvej_id uuid;
ALTER TABLE adgangsadresser_history ADD COLUMN navngivenvej_id uuid;

CREATE TABLE navngivenvej_postnummer(
  navngivenvej_id uuid NOT NULL,
  postnr smallint NOT NULL,
  tekst text NOT NULL,
  PRIMARY KEY(navngivenvej_id, postnr)
);

CREATE INDEX ON adgangsadresser(navngivenvej_id, postnr);
