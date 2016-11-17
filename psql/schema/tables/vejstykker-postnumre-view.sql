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

DROP TABLE IF EXISTS vejstykkerpostnumremat_history CASCADE;
CREATE TABLE vejstykkerpostnumremat_history (
  valid_from  INTEGER,
  valid_to    INTEGER,
  kommunekode SMALLINT,
  vejkode     SMALLINT,
  postnr      SMALLINT
);

CREATE INDEX ON vejstykkerpostnumremat_history(valid_to);
CREATE INDEX ON vejstykkerpostnumremat_history(valid_from);
CREATE INDEX ON vejstykkerpostnumremat_history(kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat_history(vejkode);
