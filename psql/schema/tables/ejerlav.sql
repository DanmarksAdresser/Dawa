DROP TABLE IF EXISTS ejerlav CASCADE;

CREATE TABLE ejerlav (
  kode INTEGER,
  navn VARCHAR(255) NOT NULL,
  PRIMARY KEY(kode)
);


DROP TABLE IF EXISTS ejerlav_history CASCADE;
CREATE TABLE IF NOT EXISTS ejerlav_history (
  valid_from integer,
  valid_to integer,
  kode INTEGER,
  navn VARCHAR(255) NOT NULL
);

CREATE INDEX ON ejerlav_history(kode);
CREATE INDEX ON ejerlav_history(valid_from);
CREATE INDEX ON ejerlav_history(valid_to);