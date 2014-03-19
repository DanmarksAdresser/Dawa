
\set ON_ERROR_STOP on
\set ECHO queries

INSERT INTO VejstykkerPostnumreMat SELECT DISTINCT kommunekode, vejkode, postnr FROM adgangsadresser;

