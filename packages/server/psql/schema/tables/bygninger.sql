DROP TABLE IF EXISTS bygninger CASCADE;

CREATE TABLE bygninger (
  id            BIGINT PRIMARY KEY,
  bygningstype  TEXT,
  metode3d      TEXT,
  målested      TEXT,
  bbrbygning_id UUID,
  synlig        BOOLEAN,
  overlap       BOOLEAN,
  ændret        TIMESTAMPTZ,
  geom          GEOMETRY(PolygonZ, 25832),
  bbox          GEOMETRY(Polygon, 25832),
  visueltcenter GEOMETRY(Point, 25832)
);

CREATE INDEX ON bygninger (bbrbygning_id);
CREATE INDEX ON bygninger (bygningstype);
CREATE INDEX ON bygninger (metode3d);
CREATE INDEX ON bygninger (målested);
CREATE INDEX ON bygninger USING GIST (geom);
