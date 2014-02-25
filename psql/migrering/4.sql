

\set ON_ERROR_STOP on
\set ECHO queries

\echo '\n***** Updating wgs84 and geom columns'

BEGIN;
ALTER TABLE adgangsadresser DISABLE TRIGGER ALL;

DROP INDEX adgangsadresser_geom_idx;

UPDATE adgangsadresser SET wgs84 = ST_GeometryFromText('POINT('||wgs84long||' '||wgs84lat||')', 4326)
WHERE wgs84lat IS NOT NULL AND wgs84long IS NOT NULL;

UPDATE adgangsadresser SET geom = wgs84::geometry;

CREATE INDEX ON Adgangsadresser USING GIST (geom);

ALTER TABLE adgangsadresser ENABLE TRIGGER ALL;
COMMIT;

VACUUM ANALYZE;
