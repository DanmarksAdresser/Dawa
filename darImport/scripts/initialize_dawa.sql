-- do the insert
INSERT INTO vejstykker SELECT * FROM full_vejstykker;
INSERT INTO adgangsadresser SELECT * FROM full_adgangsadresser;
INSERT INTO enhedsadresser SELECT * FROM full_enhedsadresser;
