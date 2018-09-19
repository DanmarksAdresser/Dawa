DROP TABLE IF EXISTS bygninger CASCADE;

CREATE  TABLE bygninger (
  id            BIGINT primary key,
  bygningstype  TEXT,
  målemetode    TEXT,
  målested      TEXT,
  bbrbygning_id UUID,
  ændret timestamptz NOT NULL DEFAULT now(),
  geo_version integer NOT NULL DEFAULT 1,
  geo_ændret timestamptz NOT NULL DEFAULT now(),
  geom geometry(PolygonZ, 25832),
  bbox geometry(Polygon, 25832),
  visueltcenter geometry(Point, 25832)
);

CREATE INDEX ON bygninger(bbrbygning_id);
CREATE INDEX ON bygninger(bygningstype);
CREATE INDEX ON bygninger(målemetode);
CREATE INDEX ON bygninger(målested);
CREATE INDEX ON bygninger USING GIST(geom);
