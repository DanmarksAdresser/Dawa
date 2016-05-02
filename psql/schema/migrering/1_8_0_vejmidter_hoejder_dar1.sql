ALTER TABLE vejstykker ADD COLUMN geom geometry(MULTILINESTRINGZ, 25832);
ALTER TABLE vejstykker_history ADD COLUMN geom geometry(MULTILINESTRINGZ, 25832);
CREATE INDEX ON vejstykker USING GIST(geom);

ALTER TABLE adgangsadresser ADD COLUMN hoejde double precision;
ALTER TABLE adgangsadresser_history ADD COLUMN hoejde double precision;

ALTER TABLE adgangsadresser ADD COLUMN z_x double precision;
ALTER TABLE adgangsadresser ADD COLUMN z_y double precision;
ALTER TABLE adgangsadresser ADD COLUMN disableheightlookup timestamptz;


CREATE INDEX ON adgangsadresser (id)
  WHERE etrs89oest IS NOT NULL AND
        etrs89nord IS NOT NULL AND
        (z_x IS NULL OR z_y IS NULL OR
        z_x <> etrs89oest OR z_y <> etrs89nord);
