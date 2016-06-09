DROP TABLE IF EXISTS bebyggelser_adgadr;
CREATE TABLE bebyggelser_adgadr(
  bebyggelse_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL,
  PRIMARY KEY(bebyggelse_id, adgangsadresse_id)
);

-- Covering index for better performance
CREATE INDEX ON bebyggelser_adgadr(adgangsadresse_id, bebyggelse_id);

DROP TABLE IF EXISTS bebyggelser_adgadr_history;
CREATE TABLE bebyggelser_adgadr_history(
  valid_from integer,
  valid_to integer,
  bebyggelse_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL
);

CREATE INDEX ON bebyggelser_adgadr_history(valid_from);
CREATE INDEX ON bebyggelser_adgadr_history(valid_to);
CREATE INDEX ON bebyggelser_adgadr_history(adgangsadresse_id);
CREATE INDEX ON bebyggelser_adgadr_history(bebyggelse_id, adgangsadresse_id);
