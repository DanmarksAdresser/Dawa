CREATE OR REPLACE FUNCTION dar1_current_time() RETURNS timestamptz LANGUAGE sql AS
$$
SELECT virkning from dar1_curtime;
$$;

--
-- From: https://wiki.postgresql.org/wiki/First/last_(aggregate)
--
-- Create a function that always returns the first non-NULL item
CREATE OR REPLACE FUNCTION public.first_agg ( anyelement, anyelement )
RETURNS anyelement LANGUAGE sql IMMUTABLE STRICT AS $$
        SELECT $1;
$$;

-- And then wrap an aggregate around it
DROP AGGREGATE IF EXISTS public.first(anyelement) CASCADE;
CREATE AGGREGATE public.first (
        sfunc    = public.first_agg,
        basetype = anyelement,
        stype    = anyelement
);

-- Create a function that always returns the last non-NULL item
CREATE OR REPLACE FUNCTION public.last_agg ( anyelement, anyelement )
RETURNS anyelement LANGUAGE sql IMMUTABLE STRICT AS $$
        SELECT $2;
$$;

-- And then wrap an aggregate around it
DROP AGGREGATE IF EXISTS public.last(anyelement) CASCADE;
CREATE AGGREGATE public.last (
        sfunc    = public.last_agg,
        basetype = anyelement,
        stype    = anyelement
);

CREATE OR REPLACE FUNCTION processForIndexing(text) RETURNS text AS $$
BEGIN
  RETURN REGEXP_REPLACE($1, '[\\.\\/\\-]', ' ', 'g');
END;
  $$ language plpgsql;

CREATE OR REPLACE FUNCTION parseHusnr(text) RETURNS husnr AS $$
SELECT CASE WHEN $1 IS NULL THEN null ELSE (substring($1, '([0-9]{1,3})[A-Z]{0,1}')::smallint, substring($1, '[0-9]{1,3}([A-Z]{0,1})'))::husnr END;
$$ language sql;

CREATE OR REPLACE FUNCTION formatHusnr(husnr) RETURNS text AS $$
select $1.tal || $1.bogstav;
$$ language sql;

CREATE OR REPLACE FUNCTION utc_trunc_date(timestamptz) RETURNS timestamptz AS $$
select date_trunc('day', $1 at time zone 'europe/copenhagen') at time zone 'utc';
$$ language sql;

DROP TYPE IF EXISTS BebyggelseRef CASCADE;
CREATE TYPE BebyggelseRef AS (
  id uuid,
  kode integer,
  type bebyggelsestype,
  navn varchar
);


-- CREATE OR REPLACE FUNCTION dar1_status_til_kode(dar1_status)
--   RETURNS SMALLINT AS $$
-- SELECT CASE $1
--        WHEN 'Gældende'
--          THEN 1::smallint
--        WHEN 'Nedlagt'
--          THEN 2::smallint
--        WHEN 'Foreløbig'
--          THEN 3::smallint
--        WHEN 'Henlagt'
--          THEN 4::smallint
--        END;
-- $$ LANGUAGE SQL;
