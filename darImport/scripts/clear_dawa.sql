-- Clear existing DAWA tables
DELETE FROM vejstykker;
DELETE FROM vejstykker_changes;
DELETE FROM navngivenvej;
DELETE FROM navngivenvej_changes;
DELETE FROM adgangsadresser;
DELETE FROM adgangsadresser_changes;
DELETE FROM enhedsadresser;
DELETE FROM enhedsadresser_changes;
DELETE FROM adgangsadresser_temaer_matview;
DELETE FROM adgangsadresser_temaer_matview_history;
DELETE FROM bebyggelser_adgadr;
DELETE FROM bebyggelser_adgadr_history;
DELETE FROM vejstykkerpostnumremat;
DELETE FROM vejstykkerpostnumremat_changes;

DELETE FROM navngivenvej_postnummer;
DELETE FROM navngivenvej_postnummer_changes;

DELETE FROM vejpunkter;
DELETE FROM vejpunkter_changes;


DELETE FROM transaction_history
WHERE
  entity IN ('vejstykke', 'adgangsadresse', 'adresse', 'adgangsadresse_tema', 'bebyggelsestilknytning');

