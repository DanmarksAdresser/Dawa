
\set ON_ERROR_STOP on
\set ECHO queries

CREATE OR REPLACE FUNCTION makeRectangle(xmin DOUBLE PRECISION,
                                         ymin DOUBLE PRECISION, xmax DOUBLE PRECISION,
                                         ymax DOUBLE PRECISION, srid integer)
  RETURNS geometry AS
  $$
  BEGIN
    RETURN st_setsrid(st_makepolygon(st_makeline(ARRAY [st_makepoint(xmin, ymin), st_makepoint(xmin, ymax), st_makepoint(xmax,
                                                                                                              ymax), st_makepoint(
        xmax, ymin), st_makepoint(xmin, ymin)])), srid);
  END;
  $$ LANGUAGE plpgsql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION splitToGridRecursive(g geometry,  maxPointCount INTEGER)
  RETURNS SETOF geometry AS
  $$
  DECLARE
    xmin DOUBLE PRECISION;
    xmax   DOUBLE PRECISION;
    ymin   DOUBLE PRECISION;
    ymax   DOUBLE PRECISION;
    dx   DOUBLE PRECISION;
    dy DOUBLE PRECISION;
    r1 geometry;
    r2 geometry;
    i1 geometry;
    i2 geometry;
    points INTEGER;
  srid integer;
  BEGIN
    points := ST_NPoints(g);
--    RAISE NOTICE 'Points: (%)', points;

    IF points <= maxPointCount THEN
      RETURN QUERY SELECT g;
      RETURN;
    END IF;
    xmin := ST_XMin(g);
    xmax := ST_XMax(g);
    ymin := ST_YMin(g);
    ymax := ST_YMax(g);
    dx := xmax - xmin;
    dy := ymax - ymin;
      srid := st_srid(g);
--    RAISE NOTICE 'xmin: (%), ymin: (%), xmax: (%), ymax: (%)', xmin, ymin, xmax, ymax;
    IF(dx > dy) THEN
      r1 := makeRectangle(xmin, ymin, xmin + dx/2, ymax, srid);
      r2 := makeRectangle(xmin + dx/2, ymin, xmax, ymax, srid);
    ELSE
      r1 := makeRectangle(xmin, ymin, xmax, ymin + dy/2, srid);
      r2 := makeRectangle(xmin, ymin + dy/2, xmax, ymax, srid);
    END IF;
    i1 := st_intersection(g, r1);
    i2 := st_intersection(g, r2);
    RETURN QUERY SELECT splitToGridRecursive(i1, maxPointCount);
    RETURN QUERY SELECT splitToGridRecursive(i2, maxPointCount);
    RETURN;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE STRICT;

DROP TABLE IF EXISTS GriddedDagiTemaer;
CREATE TABLE GriddedDagiTemaer(
  tema dagiTemaType not null,
  kode integer not null,
  geom geometry
);

CREATE INDEX ON GriddedDagiTemaer(tema, kode);
CREATE INDEX ON GriddedDagiTemaer USING GIST(geom);

CREATE OR REPLACE FUNCTION update_gridded_dagi_temaer()
  RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.geom = NEW.geom THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM GriddedDagiTemaer WHERE tema = OLD.tema AND kode = OLD.kode;
    DELETE FROM AdgangsAdresserDagiRel WHERE dagiTema = OLD.tema AND dagiKode = OLD.kode;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO GriddedDagiTemaer (tema, kode, geom)
      (SELECT
         NEW.tema,
        NEW.kode,
         splitToGridRecursive(NEW.geom, 100) as geom);
    INSERT INTO AdgangsadresserDagiRel(adgangsadresseid, dagitema, dagikode)
      (SELECT DISTINCT Adgangsadresser.id, GriddedDagiTemaer.tema, GriddedDagiTemaer.kode
       FROM Adgangsadresser
         JOIN GriddedDagiTemaer ON ST_Contains(GriddedDagiTemaer.geom, Adgangsadresser.geom)
      WHERE
        GriddedDagiTemaer.tema = NEW.tema AND GriddedDagiTemaer.kode = NEW.kode);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION update_adgangsadresser_dagi_rel_adgangsadresser()
  RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.geom = NEW.geom) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM AdgangsadresserDagiRel WHERE adgangsadresseid = OLD.id;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO AdgangsadresserDagiRel (adgangsadresseid, dagiTema, dagiKode)
      (SELECT DISTINCT
         Adgangsadresser.id,
         Dagitemaer.tema,
         Dagitemaer.kode
       FROM Adgangsadresser, GriddedDagitemaer
       WHERE Adgangsadresser.id = NEW.id AND ST_Contains(GriddedDagitemaer.geom, Adgangsadresser.geom));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_adgangsadresser_dagi_rel_adgangsadresser ON adgangsadresser;
CREATE TRIGGER update_adgangsadresser_dagi_rel_adgangsadresser AFTER INSERT OR UPDATE OR DELETE ON adgangsadresser
FOR EACH ROW EXECUTE PROCEDURE update_adgangsadresser_dagi_rel_adgangsadresser();

DROP TRIGGER IF EXISTS update_adgangsadresser_dagi_rel_dagitemaer ON DagiTemaer;
DROP TRIGGER IF EXISTS update_gridded_dagi_temaer ON DagiTemaer;
CREATE TRIGGER update_gridded_dagi_temaer AFTER INSERT OR UPDATE OR DELETE ON DagiTemaer
FOR EACH ROW EXECUTE PROCEDURE update_gridded_dagi_temaer();


-- Init function
DROP FUNCTION IF EXISTS griddeddagitemaer_init() CASCADE;
CREATE FUNCTION griddeddagitemaer_init() RETURNS void
LANGUAGE plpgsql AS
$$
  BEGIN
    NULL;
  END;
$$;
