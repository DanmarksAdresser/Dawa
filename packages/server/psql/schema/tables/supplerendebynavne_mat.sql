DROP TABLE IF EXISTS SupplerendeBynavne CASCADE;
DROP TABLE IF EXISTS supplerendebynavne_mat CASCADE;
CREATE TABLE supplerendebynavne_mat(
  navn TEXT NOT NULL PRIMARY KEY,
  tsv tsvector
);
CREATE INDEX ON supplerendebynavne_mat USING gin(tsv);