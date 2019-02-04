DROP TABLE IF EXISTS supplerendebynavn_kommune_mat CASCADE;
CREATE TABLE supplerendebynavn_kommune_mat(
  supplerendebynavn text NOT NULL,
  kommunekode smallint NOT NULL,
  PRIMARY KEY (supplerendebynavn, kommunekode)
);

CREATE INDEX ON supplerendebynavn_kommune_mat(kommunekode, supplerendebynavn);