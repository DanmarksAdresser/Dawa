DROP VIEW IF EXISTS wms_vejnavneomraader CASCADE;
CREATE VIEW wms_vejnavneomraader AS (
  SELECT
    id :: TEXT,
    darstatus,
    navn,
    beliggenhed_vejnavneområde as geom
  FROM navngivenvej_mat
  WHERE beliggenhed_vejnavneområde IS NOT NULL
);

DROP VIEW IF EXISTS wms_vejnavnelinjer CASCADE;
CREATE VIEW wms_vejnavnelinjer AS (
  SELECT
    id :: TEXT,
    darstatus,
    navn,
    beliggenhed_vejnavnelinje as geom
  FROM navngivenvej_mat
  WHERE beliggenhed_vejnavnelinje IS NOT NULL
);

DROP VIEW IF EXISTS wms_vejtilslutningspunkter CASCADE;
CREATE VIEW wms_vejtilslutningspunkter AS (
  SELECT
    id :: TEXT,
    darstatus,
    navn,
    beliggenhed_vejtilslutningspunkter as geom
  FROM navngivenvej_mat
  WHERE beliggenhed_vejtilslutningspunkter IS NOT NULL
);