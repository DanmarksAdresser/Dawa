DROP TABLE IF EXISTS supplerendebynavn_postnr_mat CASCADE;
CREATE TABLE supplerendebynavn_postnr_mat(
  supplerendebynavn text NOT NULL,
  postnr SMALLINT not null,
  PRIMARY KEY (supplerendebynavn, postnr)
);

CREATE INDEX ON supplerendebynavn_postnr_mat(postnr,supplerendebynavn);