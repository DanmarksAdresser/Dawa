DROP TABLE IF EXISTS steder CASCADE;
CREATE TABLE steder(
  id uuid PRIMARY KEY,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  hovedtype text NOT NULL,
  undertype text NOT NULL,
  bebyggelseskode integer,
  indbyggerantal integer,
  visueltcenter geometry(point, 25832),
  bbox geometry(Polygon, 25832),
  geom geometry(geometry, 25832)
);

CREATE INDEX ON steder(hovedtype, undertype);
CREATE INDEX ON steder(undertype);
CREATE INDEX ON steder USING GIST(geom);

DROP TABLE IF EXISTS stednavne CASCADE;
CREATE TABLE stednavne(
  stedid uuid NOT NULL,
  navn text NOT NULL,
  navnestatus text not null,
  brugsprioritet text not null,
  tsv tsvector,
  PRIMARY KEY (stedid, navn)
);

CREATE INDEX ON stednavne(stedid);
CREATE INDEX ON stednavne USING GIN(tsv);
CREATE INDEX ON stednavne(navn);
CREATE INDEX ON stednavne USING GIST(navn gist_trgm_ops);
