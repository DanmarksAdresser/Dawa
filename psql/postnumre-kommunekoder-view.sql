
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS PostnumreKommunekoderMat;
CREATE TABLE PostnumreKommunekoderMat(postnr integer not null, kommunekode integer not null, primary key(postnr, kommunekode));
INSERT INTO PostnumreKommunekoderMat SELECT DISTINCT postnr, kommunekode FROM VejstykkerPostnumreMat
WHERE postnr is not null and kommunekode is not null;

