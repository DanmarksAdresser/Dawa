CREATE TEMP TABLE dirty_vejstykker
AS (SELECT kommunekode, vejkode as kode FROM insert_dar_vejnavn
UNION SELECT kommunekode, vejkode as kode FROM update_dar_vejnavn
UNION SELECT v.kommunekode,v.vejkode as kode FROM delete_dar_vejnavn  del JOIN dar_vejnavn v on del.id = v.id)