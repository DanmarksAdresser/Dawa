
\set ON_ERROR_STOP on
\set ECHO queries

INSERT INTO PostnumreKommunekoderMat SELECT DISTINCT postnr, kommunekode FROM adgangsadresser;


