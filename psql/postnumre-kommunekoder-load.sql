
INSERT INTO PostnumreKommunekoderMat SELECT DISTINCT postnr, kommunekode FROM VejstykkerPostnumreMat
WHERE postnr is not null and kommunekode is not null;

