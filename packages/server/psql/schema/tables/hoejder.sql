-- Table containing heights exposed on replication API
DROP TABLE IF EXISTS hoejder CASCADE;
create table hoejder (
  husnummerid uuid primary key,
  hoejde double precision null
);

-- Table containing the most recent importer result for each address, and the coordinates used.
DROP TABLE IF EXISTS hoejde_importer_resultater CASCADE;
create table hoejde_importer_resultater(
  husnummerid uuid primary key,
  hoejde double precision NULL,
  -- the coordinates we used when we looked up the height
  position geometry(point, 25832)
);

-- Contains a list of pending height lookups
DROP table IF EXISTS hoejde_importer_afventer CASCADE;
create table hoejde_importer_afventer(
  husnummerid uuid primary key,
  adgangspunktid uuid
);

DROP TABLE IF EXISTS hoejde_importer_disabled CASCADE;
create table hoejde_importer_disabled(
                                       husnummerid uuid primary key,
  -- disable height lookup until this timestamp
                                       disableuntil timestamptz
);
