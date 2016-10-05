CREATE OR REPLACE FUNCTION dar1_current_time()
  RETURNS TIMESTAMPTZ LANGUAGE SQL AS
$$
SELECT virkning
FROM dar1_meta;
$$;

CREATE OR REPLACE FUNCTION dar1_current_tx()
  RETURNS INTEGER LANGUAGE SQL AS
$$
SELECT current_tx
FROM dar1_meta;
$$;

--
-- From: https://wiki.postgresql.org/wiki/First/last_(aggregate)
--
-- Create a function that always returns the first non-NULL item
CREATE OR REPLACE FUNCTION public.first_agg(ANYELEMENT, ANYELEMENT)
  RETURNS ANYELEMENT LANGUAGE SQL IMMUTABLE STRICT AS $$
SELECT $1;
$$;

-- And then wrap an aggregate around it
DROP AGGREGATE IF EXISTS public.first( ANYELEMENT ) CASCADE;
CREATE AGGREGATE public.first (
SFUNC = PUBLIC.first_agg,
BASETYPE = ANYELEMENT,
STYPE = ANYELEMENT
);

-- Create a function that always returns the last non-NULL item
CREATE OR REPLACE FUNCTION public.last_agg(ANYELEMENT, ANYELEMENT)
  RETURNS ANYELEMENT LANGUAGE SQL IMMUTABLE STRICT AS $$
SELECT $2;
$$;

-- And then wrap an aggregate around it
DROP AGGREGATE IF EXISTS public.last( ANYELEMENT ) CASCADE;
CREATE AGGREGATE public.last (
SFUNC = PUBLIC.last_agg,
BASETYPE = ANYELEMENT,
STYPE = ANYELEMENT
);

CREATE OR REPLACE FUNCTION processForIndexing(TEXT)
  RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE($1, '[\\.\\/\\-]', ' ', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE FUNCTION parseHusnr(TEXT)
  RETURNS husnr AS $$
SELECT CASE WHEN $1 IS NULL
  THEN NULL
       ELSE (substring($1, '([0-9]{1,3})[A-Z]{0,1}') :: SMALLINT, substring($1,
                                                                            '[0-9]{1,3}([A-Z]{0,1})')) :: husnr END;
$$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE FUNCTION formatHusnr(husnr)
  RETURNS TEXT AS $$
SELECT $1.tal || $1.bogstav;
$$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

CREATE OR REPLACE FUNCTION utc_trunc_date(TIMESTAMPTZ)
  RETURNS TIMESTAMPTZ AS $$
SELECT date_trunc('day', $1 AT TIME ZONE 'europe/copenhagen') AT TIME ZONE 'utc';
$$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

DROP TYPE IF EXISTS BebyggelseRef CASCADE;
CREATE TYPE BebyggelseRef AS (
  id   UUID,
  kode INTEGER,
  type bebyggelsestype,
  navn VARCHAR
);

CREATE OR REPLACE FUNCTION dar1_status_til_dawa_status(INTEGER)
  RETURNS INTEGER AS
$$
SELECT CASE $1
       WHEN 2
         THEN 3 -- foreløbig
       WHEN 3
         THEN 1 -- gældende
       WHEN 4
         THEN 2 -- nedlagt
       WHEN 5
         THEN 4 -- henlagt
       ELSE
         0
       END;
$$ LANGUAGE SQL IMMUTABLE RETURNS NULL ON NULL INPUT;

DROP TYPE IF EXISTS VejstykkeRef CASCADE;
CREATE TYPE VejstykkeRef AS (
  kommunekode integer,
  kode integer
);
