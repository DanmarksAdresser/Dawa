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
CREATE INDEX ON temaer(tema, (fields->>'ejerlavkode'), (fields->>'matrikelnr'));

-- Support lookup using integer type
CREATE INDEX ON temaer(((fields->>'kode')::integer)) WHERE ((fields->>'kode')::integer is not null);
CREATE INDEX ON temaer(((fields->>'nr')::integer)) WHERE ((fields->>'nr')::integer is not null);
CREATE INDEX ON temaer(((fields->>'ejerlavkode')::integer), (fields->>'matrikelnr')) WHERE ((fields->>'ejerlavkode') is not null);

-- More efficient if tema is already given
CREATE INDEX ON temaer(tema,(fields->>'kode')) WHERE ((fields->>'kode') is not null);
CREATE INDEX ON temaer(tema,(fields->>'nr')) WHERE ((fields->>'nr') is not null);
CREATE INDEX ON temaer(tema,(fields->>'ejerlavkode'), (fields->>'matrikelnr')) WHERE ((fields->>'ejerlavkode') is not null);
CREATE INDEX ON temaer(tema,((fields->>'kode')::integer)) WHERE ((fields->>'kode')::integer is not null);
CREATE INDEX ON temaer(tema,((fields->>'nr')::integer)) WHERE ((fields->>'nr')::integer is not null);
CREATE INDEX ON temaer(tema,((fields->>'ejerlavkode')::integer), (fields->>'matrikelnr')) WHERE ((fields->>'ejerlavkode') is not null);
