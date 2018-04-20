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
BEGIN
  RETURN QUERY SELECT splitToGridRecursive(g, maxPointCount, true);
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION splitToGridRecursive(g geometry,  maxPointCount INTEGER, forceMultiPolygons BOOLEAN)
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
    k1 geometry;
    k2 geometry;
    points INTEGER;
  srid integer;
  BEGIN
    points := ST_NPoints(g);
--    RAISE NOTICE 'Points: (%)', points;

    IF points <= maxPointCount THEN
      IF(forceMultiPolygons) THEN
        RETURN QUERY SELECT ST_Multi(g);
      ELSE
        RETURN QUERY SELECT g;
      END IF;
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
--    RAISE NOTICE 'bbox: (%)', st_astext(makerectangle(xmin, ymin, xmax, ymax, srid));
--    RAISE NOTICE 'r1: (%), r2: (%)', st_astext(r1), st_astext(r2);
    k1 := st_intersection(g, r1);
    k2 := st_intersection(g, r2);
    IF (forceMultiPolygons) THEN
      i1 := ST_Multi(ST_CollectionExtract(k1, 3));
      i2 := ST_Multi(ST_CollectionExtract(k2, 3));
    ELSE
      i1 := ST_Multi(ST_CollectionExtract(k1, st_dimension(k1) + 1));
      i2 := ST_Multi(ST_CollectionExtract(k2, st_dimension(k2) + 1));
    END IF;
    RETURN QUERY SELECT splitToGridRecursive(i1, maxPointCount, forceMultiPolygons);
    RETURN QUERY SELECT splitToGridRecursive(i2, maxPointCount, forceMultiPolygons);
    RETURN;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE STRICT;