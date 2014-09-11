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

CREATE OR REPLACE FUNCTION update_gridded_temaer_matview()
  RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.geom = NEW.geom THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
  THEN
    DELETE FROM gridded_temaer_matview WHERE tema = OLD.tema AND id = OLD.id;

    DELETE FROM adgangsadresser_temaer_matview WHERE tema = OLD.tema AND tema_id = OLD.id;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT'
  THEN
    INSERT INTO gridded_temaer_matview (tema, id, geom)
      (SELECT
         NEW.tema,
        NEW.id,
         splitToGridRecursive(NEW.geom, 100) as geom);
    INSERT INTO adgangsadresser_temaer_matview(adgangsadresse_id, tema, tema_id)
      (SELECT DISTINCT Adgangsadresser.id, gridded_temaer_matview.tema, gridded_temaer_matview.id
       FROM Adgangsadresser
         JOIN gridded_temaer_matview ON ST_Contains(gridded_temaer_matview.geom, Adgangsadresser.geom)
      WHERE
        gridded_temaer_matview.tema = NEW.tema AND gridded_temaer_matview.id = NEW.id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

DROP TRIGGER IF EXISTS update_gridded_temaer_matview_on_temaer ON temaer;
CREATE TRIGGER update_gridded_temaer_matview_on_temaer AFTER INSERT OR UPDATE OR DELETE ON temaer
FOR EACH ROW EXECUTE PROCEDURE update_gridded_temaer_matview();


-- Init function
DROP FUNCTION IF EXISTS gridded_temaer_matview_init() CASCADE;
CREATE FUNCTION gridded_temaer_matview_init() RETURNS void
LANGUAGE plpgsql AS
  $$
  BEGIN
    NULL;
  END;
$$;
