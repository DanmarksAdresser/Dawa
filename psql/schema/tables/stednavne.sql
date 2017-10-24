DROP TABLE IF EXISTS stednavne CASCADE;
CREATE TABLE stednavne(
  id uuid PRIMARY KEY,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  hovedtype text NOT NULL,
  undertype text NOT NULL,
  navn text NOT NULL,
  navnestatus text not null,
  bebyggelseskode integer,
  tsv tsvector,
  visueltcenter geometry(point, 25832),
  geom geometry(geometry, 25832)
);

CREATE INDEX ON stednavne USING GIN(tsv);
CREATE INDEX ON stednavne(navn);
CREATE INDEX ON stednavne(hovedtype, undertype);
CREATE INDEX ON stednavne(undertype);
