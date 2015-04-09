CREATE TEMP TABLE dirty_adgangsadresser AS (
  WITH dirty_vejstykker AS (
    SELECT
      kommunekode,
      vejkode
    FROM insert_dar_postnr
    UNION SELECT
            kommunekode,
            vejkode
          FROM update_dar_postnr
    UNION SELECT
            kommunekode,
            vejkode
          FROM delete_dar_postnr del LEFT JOIN dar_postnr dst ON del.id = dst.id
    UNION SELECT
            kommunekode,
            vejkode
          FROM insert_dar_supplerendebynavn
    UNION SELECT
            kommunekode,
            vejkode
          FROM update_dar_supplerendebynavn
    UNION SELECT
            kommunekode,
            vejkode
          FROM delete_dar_supplerendebynavn del LEFT JOIN dar_supplerendebynavn dst ON del.id = dst.id)
-- select all ids where postnr or supplerendebynavn has changed
  SELECT a.id
  FROM adgangsadresser a JOIN dirty_vejstykker d ON a.kommunekode = d.kommunekode AND a.vejkode = d.vejkode
-- add all new husnummer
UNION SELECT bkid as id FROM insert_dar_husnummer
-- add all updated husnummer
UNION SELECT bkid as id FROM update_dar_husnummer
-- add all deleted husnummer
UNION SELECT bkid as id FROM delete_dar_husnummer del JOIN dar_husnummer hn ON del.versionid = hn.versionid
-- add all where husnummer has not changed, but the adgangspunkt has appeared (should not happen)
UNION SELECT hn.bkid as id FROM insert_dar_adgangspunkt ap JOIN dar_husnummer hn ON hn.adgangspunktid = ap.id
-- add all where husnummer has not changed, but adgangspunkt has changed
UNION SELECT hn.bkid as id FROM update_dar_adgangspunkt ap JOIN dar_husnummer hn ON hn.adgangspunktid = ap.id)
-- add all where husnummer has not changed, but adgangspunkt is deleted (should not happen)
UNION SELECT hn.bkid as id FROM delete_dar_adgangspunkt del
JOIN dar_adgangspunkt ap ON del.versionid = ap.id
JOIN dar_husnummer hn ON ap.id = hn.adgangspunktid