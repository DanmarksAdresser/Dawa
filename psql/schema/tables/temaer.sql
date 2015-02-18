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

-- Kommune
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'kommune';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'kommune';

-- Region
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'region';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'region';

-- Sogn
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'sogn';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'sogn';

-- Retskreds
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'retskreds';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'retskreds';

-- Politikreds
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'politikreds';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'politikreds';

-- Opstillingskreds
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'opstillingskreds';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'opstillingskreds';

-- afstemningsomraade
CREATE INDEX ON temaer((fields->>'kode')) WHERE tema = 'afstemningsomraade';
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE tema = 'afstemningsomraade';

-- Valglandsdel
CREATE INDEX ON temaer((fields->>'bogstav')) WHERE tema = 'valglandsdel';

-- Postnummer
CREATE INDEX ON temaer((fields->>'nr')) WHERE tema = 'postnummer';
CREATE INDEX ON temaer(((fields->>'nr')::integer)) WHERE tema = 'postnummer';

-- Jordstykker
CREATE INDEX ON temaer((fields->>'ejerlavkode'), (fields->>'matrikelnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer(((fields->>'ejerlavkode')::integer), (fields->>'matrikelnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'kommunekode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'regionskode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'retskredskode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'sognekode')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'esrejendomsnr')) WHERE tema = 'jordstykke';
CREATE INDEX ON temaer((fields->>'sfeejendomsnr')) WHERE tema = 'jordstykke';