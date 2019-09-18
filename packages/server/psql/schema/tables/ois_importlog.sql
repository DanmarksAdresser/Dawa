DROP TABLE IF EXISTS ois_importlog CASCADE;

CREATE TABLE ois_importlog(
  oistable text not null,
  serial integer not null,
  total boolean not null,
  ts timestamptz not null,
  PRIMARY KEY(oistable, serial)
);
