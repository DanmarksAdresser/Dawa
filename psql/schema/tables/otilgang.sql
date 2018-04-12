DROP TABLE IF EXISTS otilgang CASCADE;
CREATE TABLE otilgang(
  sdfe_id integer PRIMARY KEY,
  gv_adgang_bro boolean,
  gv_adgang_faerge boolean,
  ikke_oe boolean,
  manually_checked text,
  geom geometry(point, 25832)
);