DELETE FROM DagiTemaer;
DROP TABLE DagiTemaer CASCADE;
DROP TABLE GriddedDagiTemaer CASCADE;
DROP TABLE AdgangsadresserDagiRel CASCADE;
DROP FUNCTION adgangsadresserdagirel_update_on_adgangsadresse() CASCADE;
DROP TYPE DagiTemaType CASCADE;


DROP TYPE IF EXISTS tema_type CASCADE;
CREATE TYPE tema_type AS
ENUM ('kommune', 'region', 'sogn', 'opstillingskreds',
  'politikreds', 'retskreds', 'afstemningsomraade', 'postnummer',
  'danmark', 'menighedsraadsafstemningsomraade',
  'samlepostnummer', 'storkreds', 'supplerendebynavn', 'valglandsdel', 'zone');

DROP TYPE IF EXISTS tema_data CASCADE;
CREATE TYPE tema_data AS (
  tema tema_type,
  fields json
);

DROP TABLE IF EXISTS temaer CASCADE;
CREATE TABLE temaer (
  tema tema_type not null,
  id serial not null,
  aendret timestamptz not null,
  geo_version integer not null,
  geo_aendret timestamptz,
  fields json not null,
  tsv tsvector,
  geom  geometry(MultiPolygon, 25832),
  PRIMARY KEY(id)
);

CREATE INDEX ON temaer(tema);
CREATE INDEX ON temaer USING GIN(tsv);
CREATE INDEX ON temaer USING gist(geom);

-- Support lookup using string
CREATE INDEX ON temaer((fields->>'kode')) WHERE ((fields->>'kode') is not null);
CREATE INDEX ON temaer((fields->>'nr')) WHERE ((fields->>'nr') is not null);

-- Support lookup using integer type
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE ((fields->>'kode')::integer is not null);
CREATE INDEX ON temaer(((fields->>'nr')::integer)) WHERE ((fields->>'nr')::integer is not null);

-- More efficient if tema is already given
CREATE INDEX ON temaer(tema,(fields->>'kode')) WHERE ((fields->>'kode') is not null);
CREATE INDEX ON temaer(tema,(fields->>'nr')) WHERE ((fields->>'nr') is not null);
CREATE INDEX ON temaer(tema,((fields->>'kode')::integer)) WHERE ((fields->>'kode')::integer is not null);
CREATE INDEX ON temaer(tema,((fields->>'nr')::integer)) WHERE ((fields->>'nr')::integer is not null);

DROP TABLE IF EXISTS gridded_temaer_matview CASCADE;
CREATE TABLE gridded_temaer_matview(
  tema tema_type not null,
  id integer not null,
  geom geometry
);

CREATE INDEX ON gridded_temaer_matview(tema, id);
CREATE INDEX ON gridded_temaer_matview USING GIST(geom);

DROP TABLE IF EXISTS adgangsadresser_temaer_matview CASCADE;
CREATE TABLE adgangsadresser_temaer_matview(
  adgangsadresse_id uuid not null,
  tema tema_type not null,
  tema_id integer not null,
  primary key(adgangsadresse_id, tema, tema_id)
);

CREATE INDEX ON adgangsadresser_temaer_matview(tema, tema_id, adgangsadresse_id);
CREATE INDEX ON adgangsadresser_temaer_matview(tema, adgangsadresse_id);