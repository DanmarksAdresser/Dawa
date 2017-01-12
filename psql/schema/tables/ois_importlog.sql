DROP TABLE IF EXISTS ois_importlog CASCADE;

CREATE TABLE ois_importlog(
  entity text not null,
  serial integer not null,
  total boolean not null,
  ts timestamptz not null,
  PRIMARY KEY(entity, serial)
);
