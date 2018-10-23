DROP TABLE IF EXISTS supplerendebynavn2_postnr;

CREATE TABLE supplerendebynavn2_postnr(
  supplerendebynavn_dagi_id integer,
  postnr smallint,
  primary key(supplerendebynavn_dagi_id, postnr)
);