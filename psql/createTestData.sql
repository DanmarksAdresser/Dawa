
\set ON_ERROR_STOP on
\set ECHO queries

CREATE TEMP TABLE tmp AS
SELECT enhedsadresseid, adgangsadresseid, kommunekode, vejkode, postnr
FROM adresser
WHERE postnr = 8600
      AND ST_Contains(ST_GeomFromText('POLYGON((56.19 9.5,  56.20 9.5, 56.20 9.53, 56.19 9.53, 56.19 9.5))',
                                      4326)::geometry,
                      wgs84geom);

\copy (select * from enhedsadresser e  join tmp on e.id = tmp.enhedsadresseid)  TO 'AddressSpecific.csv'  WITH CSV header;
\copy (select * from adgangsadresser a join tmp on a.id = tmp.adgangsadresseid) TO 'AddressAccess.csv' WITH CSV header;
\copy (select * from postnumre p join tmp on p.nr = tmp.postnr) TO 'PostCode.csv' WITH CSV header;
\copy (select * from vejnavne v join tmp on v.kode = tmp.vejkode AND v.kommunekode = tmp.kommunekode) TO 'RoadName.csv' WITH CSV header;
