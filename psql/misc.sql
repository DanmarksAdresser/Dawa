
\set ON_ERROR_STOP on
\set ECHO queries


DROP TYPE IF EXISTS PostnummerRef CASCADE;
CREATE TYPE PostnummerRef AS (
  nr integer,
  navn varchar
);

DROP TYPE IF EXISTS KommuneRef CASCADE;
CREATE TYPE KommuneRef AS (
  kode integer,
  navn varchar
);

DROP TYPE IF EXISTS DagiTemaType CASCADE;
CREATE TYPE DagiTemaType AS
  ENUM ('kommune', 'region', 'sogn', 'opstillingskreds',
        'politikreds', 'retskreds', 'afstemningsområde', 'postdistrikt');

DROP TYPE IF EXISTS DagiTemaRef CASCADE;
CREATE TYPE DagiTemaRef AS (
  tema DagiTemaType,
  kode integer,
  navn varchar(255)
);

DROP   TEXT SEARCH CONFIGURATION IF EXISTS adresser;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION adresser ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;

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
