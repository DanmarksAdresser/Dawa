CREATE TEMP TABLE dirty_enhedsadresser AS (
SELECT bkid as id FROM insert_dar_adresse
UNION SELECT bkid as id FROM update_dar_adresse
UNION SELECT bkid as id FROM delete_dar_adresse del JOIN dar_adresse a ON del.versionid = a.versionid)
UNION SELECT dar_adresse.bkid as id
 FROM dar_adresse WHERE husnummerid IN (
 SELECT dar_husnummer.id
  FROM dirty_adgangsadresser
   JOIN dar_husnummer ON dirty_adgangsadresser.id = dar_husnummer.bkid)
