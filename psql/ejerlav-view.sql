

\set ON_ERROR_STOP on
\set ECHO queries

DROP TABLE IF EXISTS ejerlav;
CREATE TABLE IF NOT EXISTS ejerlav (
  kode integer NOT NULL PRIMARY KEY,
  navn VARCHAR(50) NOT NULL
);
