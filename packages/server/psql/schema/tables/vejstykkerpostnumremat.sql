DROP TABLE IF EXISTS VejstykkerPostnumreMat CASCADE;
CREATE TABLE VejstykkerPostnumreMat(
  navngivenvej_id uuid,
  navngivenvejkommunedel_id uuid,
  postnummer_id uuid,
  kommunekode INTEGER,
  vejkode INTEGER,
  postnr INTEGER,
  tekst text
);

CREATE UNIQUE INDEX ON VejstykkerPostnumreMat(postnr, kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat(kommunekode, vejkode);
CREATE INDEX ON vejstykkerpostnumremat USING GIST(tekst gist_trgm_ops);
CREATE INDEX ON vejstykkerpostnumremat(navngivenvej_id);
CREATE INDEX ON vejstykkerpostnumremat(navngivenvejkommunedel_id);
CREATE INDEX ON vejstykkerpostnumremat(postnummer_id);

DROP TABLE IF EXISTS vejstykkerpostnumremat_history CASCADE;
