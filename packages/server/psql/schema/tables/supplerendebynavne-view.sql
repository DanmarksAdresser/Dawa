DROP TABLE IF EXISTS SupplerendeBynavne CASCADE;
DROP TABLE IF EXISTS supplerendebynavne_mat CASCADE;
CREATE TABLE supplerendebynavne_mat(
  navn TEXT NOT NULL PRIMARY KEY,
  tsv tsvector
);
CREATE INDEX ON supplerendebynavne_mat USING gin(tsv);

DROP TABLE IF EXISTS supplerendebynavn_kommune_mat CASCADE;
CREATE TABLE supplerendebynavn_kommune_mat(
  supplerendebynavn text NOT NULL,
  kommunekode smallint NOT NULL,
  PRIMARY KEY (supplerendebynavn, kommunekode)
);

CREATE INDEX ON supplerendebynavn_kommune_mat(kommunekode, supplerendebynavn);

DROP TABLE IF EXISTS supplerendebynavn_postnr_mat CASCADE;
CREATE TABLE supplerendebynavn_postnr_mat(
  supplerendebynavn text NOT NULL,
  postnr SMALLINT not null,
  PRIMARY KEY (supplerendebynavn, postnr)
);

CREATE INDEX ON supplerendebynavn_postnr_mat(postnr,supplerendebynavn);