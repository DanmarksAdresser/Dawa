DROP TYPE IF EXISTS bebyggelsestype CASCADE;
CREATE TYPE bebyggelsestype AS ENUM('by', 'bydel', 'spredtBebyggelse', 'sommerhusområde', 'sommerhusområdedel', 'industriområde', 'kolonihave', 'storby');

DROP TABLE IF EXISTS bebyggelser;
CREATE TABLE bebyggelser(
  id uuid PRIMARY KEY,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  kode integer,
  type bebyggelsestype NOT NULL,
  navn text NOT NULL,
  tsv tsvector,
  geom geometry(MultiPolygon, 25832)
);

CREATE INDEX ON bebyggelser USING GIN(tsv);
