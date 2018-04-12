DROP TABLE IF EXISTS ikke_brofaste_adresser CASCADE;
CREATE TABLE ikke_brofaste_adresser(
  adgangsadresse_id UUID not null,
  stednavn_id UUID not null,
  PRIMARY KEY(adgangsadresse_id, stednavn_id)
);