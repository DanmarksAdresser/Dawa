DROP TABLE IF EXISTS ikke_brofaste_adresser CASCADE;
CREATE TABLE ikke_brofaste_adresser(
  adgangsadresseid UUID not null,
  stedid UUID not null,
  PRIMARY KEY(adgangsadresseid, stedid)
);