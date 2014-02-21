
\set ON_ERROR_STOP on
\set ECHO queries

BEGIN;
CREATE INDEX ON adgangsadresser(matrikelnr);
CREATE INDEX ON adgangsadresser(husnr, id);
CREATE INDEX ON adgangsadresser(esrejendomsnr);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

DROP INDEX IF EXISTS adgangsadresser_ejerlavkode_idx;
CREATE INDEX ON adgangsadresser(ejerlavkode, id);

CREATE INDEX ON vejstykker(kode);
CREATE INDEX ON postnumre(navn);

DROP VIEW IF EXISTS postnumre_kommunekoder;
CREATE TABLE PostnumreKommunekoderMat(postnr integer not null, kommunekode integer not null, primary key(postnr, kommunekode));
INSERT INTO PostnumreKommunekoderMat SELECT DISTINCT postnr, kommunekode FROM VejstykkerPostnumreMat
WHERE postnr is not null and kommunekode is not null;
COMMIT;