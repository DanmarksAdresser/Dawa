DROP TABLE IF EXISTS ejerlav_ts CASCADE;

CREATE TABLE ejerlav_ts(
  ejerlavkode integer NOT NULL PRIMARY KEY,
  lastupdated timestamptz NOT NULL
);