DROP TABLE IF EXISTS VejstykkerPostnumreMat CASCADE;
CREATE TABLE VejstykkerPostnumreMat(
  kommunekode INTEGER,
  vejkode INTEGER,
  postnr INTEGER,
  tekst text
);

CREATE UNIQUE INDEX ON VejstykkerPostnumreMat(postnr, kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat(kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat USING GIST(tekst gist_trgm_ops);