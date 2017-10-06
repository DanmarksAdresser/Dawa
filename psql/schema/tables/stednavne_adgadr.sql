DROP TABLE IF EXISTS stednavne_adgadr;
CREATE TABLE stednavne_adgadr(
  stednavn_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL,
  PRIMARY KEY(stednavn_id, adgangsadresse_id)
);

-- Covering index for better performance
CREATE INDEX ON stednavne_adgadr(adgangsadresse_id, stednavn_id);

DROP TABLE IF EXISTS stednavne_adgadr_history;
CREATE TABLE stednavne_adgadr_history(
  valid_from integer,
  valid_to integer,
  stednavn_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL
);

CREATE INDEX ON stednavne_adgadr_history(valid_from);
CREATE INDEX ON stednavne_adgadr_history(valid_to);
CREATE INDEX ON stednavne_adgadr_history(adgangsadresse_id);
CREATE INDEX ON stednavne_adgadr_history(stednavn_id, adgangsadresse_id);
