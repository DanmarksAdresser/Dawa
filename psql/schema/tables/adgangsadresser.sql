DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr husnr,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr integer NULL,
  objekttype smallint,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  noejagtighed CHAR(1) NULL,
  adgangspunktkilde smallint NULL,
  husnummerkilde smallint,
  placering smallint,
  tekniskstandard CHAR(2) NULL,
  tekstretning float4 NULL,
  adressepunktaendringsdato timestamp NULL,
  esdhReference text,
  journalnummer text,
  hoejde double precision NULL,
  -- the coordinates we used when we looked up the height
  z_x double precision null,
  z_y double precision null,
  disableheightlookup timestamptz,
  navngivenvej_id uuid,
  navngivenvejkommunedel_id uuid,
  supplerendebynavn_id uuid,
  darkommuneinddeling_id uuid,
  adressepunkt_id uuid,
  postnummer_id uuid
);

CREATE INDEX ON Adgangsadresser(ejerlavkode, id);
CREATE INDEX ON Adgangsadresser(kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser(postnr, kommunekode);
CREATE INDEX ON adgangsadresser(navngivenvej_id);
CREATE INDEX ON adgangsadresser(navngivenvejkommunedel_id);
CREATE INDEX ON adgangsadresser(supplerendebynavn_id);
CREATE INDEX ON adgangsadresser(darkommuneinddeling_id);
CREATE INDEX ON adgangsadresser(adressepunkt_id);

-- Index for lookup of adgangsadresser where we need to fetch the height
CREATE INDEX ON adgangsadresser (id)
  WHERE etrs89oest IS NOT NULL AND
        etrs89nord IS NOT NULL AND
        (z_x IS NULL OR z_y IS NULL OR
         z_x <> etrs89oest OR z_y <> etrs89nord);



DROP TABLE IF EXISTS adgangsadresser_history CASCADE;
