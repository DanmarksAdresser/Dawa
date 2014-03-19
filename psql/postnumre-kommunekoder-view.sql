
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS postnumre_kommunekoder_mat;
CREATE TABLE postnumre_kommunekoder_mat(
  postnr integer NOT NULL,
  kommunekode integer NOT NULL,
  PRIMARY KEY(postnr, kommunekode)
);
