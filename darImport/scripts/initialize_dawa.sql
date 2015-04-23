-- do the insert
INSERT INTO vejstykker SELECT * FROM full_vejstykker_view;
INSERT INTO adgangsadresser SELECT * FROM full_adgangsadresser_view;
INSERT INTO enhedsadresser SELECT * FROM full_enhedsadresser_view;
