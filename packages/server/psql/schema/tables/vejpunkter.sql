DROP TABLE IF EXISTS vejpunkter CASCADE;

CREATE TABLE vejpunkter(
  id UUID PRIMARY KEY,
  husnummerid uuid not null,
  kilde text not null,
  noejagtighedsklasse text not null,
  tekniskstandard text not null,
  geom geometry(Point,25832)
);

CREATE INDEX ON vejpunkter(husnummerid);
