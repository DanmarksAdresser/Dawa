DROP TABLE IF EXISTS navngivenvej_mat CASCADE;
CREATE TABLE navngivenvej_mat(
  id uuid primary key,
  darstatus smallint not null,
  oprettet timestamptz not null,
  ændret timestamptz not null,
  ikrafttrædelse timestamptz,
  nedlagt timestamptz,
  navn text not null,
  adresseringsnavn text not null,
  administrerendekommune smallint,
  beskrivelse text,
  retskrivningskontrol text,
  udtaltvejnavn text,
  beliggenhed_oprindelse_kilde text,
  beliggenhed_oprindelse_nøjagtighedsklasse text,
  beliggenhed_oprindelse_registrering timestamptz,
  beliggenhed_oprindelse_tekniskstandard text,
  beliggenhed_vejnavnelinje geometry(Geometry,25832),
  beliggenhed_vejnavneområde geometry(Geometry,25832),
  beliggenhed_vejtilslutningspunkter  geometry(Geometry,25832),
  visueltcenter geometry(point, 25832),
  bbox geometry(Polygon, 25832),
  geom geometry(Geometry,25832),
  tsv tsvector
);

CREATE INDEX ON navngivenvej_mat(navn);
CREATE INDEX ON navngivenvej_mat(adresseringsnavn);
CREATE INDEX ON navngivenvej_mat(darstatus);
CREATE INDEX ON navngivenvej_mat using gin(tsv);
CREATE INDEX ON navngivenvej_mat using gist(beliggenhed_vejnavnelinje);
CREATE INDEX ON navngivenvej_mat using gist(beliggenhed_vejnavneområde);
CREATE INDEX ON navngivenvej_mat using gist(geom);