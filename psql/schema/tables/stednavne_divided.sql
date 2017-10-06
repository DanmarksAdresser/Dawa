DROP TABLE IF EXISTS stednavne_divided;
CREATE TABLE stednavne_divided(
  id uuid,
  geom geometry(geometry, 25832)
);

CREATE INDEX ON stednavne_divided(id);
CREATE INDEX ON stednavne_divided USING GIST(geom);
