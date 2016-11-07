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
