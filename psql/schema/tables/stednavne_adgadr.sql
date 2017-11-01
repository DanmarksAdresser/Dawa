DROP TABLE IF EXISTS stednavne_adgadr;
CREATE TABLE stednavne_adgadr(
  stednavn_id uuid NOT NULL,
  adgangsadresse_id uuid NOT NULL,
  PRIMARY KEY(stednavn_id, adgangsadresse_id)
);

-- Covering index for better performance
CREATE INDEX ON stednavne_adgadr(adgangsadresse_id, stednavn_id);

DROP TABLE IF EXISTS stednavne_adgadr_history;
