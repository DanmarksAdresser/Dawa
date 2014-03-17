
\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS PostnumreKommunekoderMat;
CREATE TABLE PostnumreKommunekoderMat(postnr integer not null, kommunekode integer not null, primary key(postnr, kommunekode));
