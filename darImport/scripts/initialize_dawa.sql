-- Clear existing DAWA tables
DELETE FROM vejstykker;
DELETE FROM vejstykker_history;
DELETE FROM adgangsadresser;
DELETE FROM adgangsadresser_history;
DELETE FROM enhedsadresser;
DELETE FROM enhedsadresser_history;
DELETE FROM adgangsadresser_temaer_matview;
DELETE FROM adgangsadresser_temaer_matview_history;

-- do the insert
INSERT INTO vejstykker SELECT * FROM full_vejstykker_view;
INSERT INTO adgangsadresser SELECT * FROM full_adgangsadresser_view;
INSERT INTO enhedsadresser SELECT * FROM full_enhedsadresser_view;
