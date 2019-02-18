CREATE EXTENSION IF  NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP SEQUENCE IF EXISTS id_sequence CASCADE;
CREATE SEQUENCE id_sequence START 1;

DROP SEQUENCE IF EXISTS rowkey_sequence CASCADE;
CREATE SEQUENCE rowkey_sequence START 1;

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

DROP TYPE IF EXISTS tema_type CASCADE;
CREATE TYPE tema_type AS
ENUM ('kommune', 'region', 'sogn', 'opstillingskreds',
  'politikreds', 'retskreds', 'afstemningsomraade', 'postnummer',
  'danmark', 'menighedsraadsafstemningsomraade',
  'samlepostnummer', 'storkreds', 'supplerendebynavn', 'valglandsdel', 'zone', 'jordstykke');

DROP TYPE IF EXISTS tema_data CASCADE;
CREATE TYPE tema_data AS (
  tema tema_type,
  fields json
);

DROP TYPE IF EXISTS husnr CASCADE;
CREATE TYPE husnr AS (
  tal smallint,
  bogstav varchar(1)
);

CREATE TYPE husnr_range AS RANGE (
  subtype = husnr
);

DROP TYPE IF EXISTS dar1_entity CASCADE;
CREATE TYPE dar1_entity AS
ENUM (
  'Adressepunkt',
  'Adresse',
  'DARAfstemningsområde',
  'DARKommuneinddeling',
  'DARMenighedsrådsafstemningsområde',
  'DARSogneinddeling',
  'Husnummer',
  'NavngivenVej',
  'NavngivenVejKommunedel',
  'NavngivenVejPostnummerRelation',
  'NavngivenVejSupplerendeBynavnRelation',
  'Postnummer',
  'ReserveretVejnavn',
  'SupplerendeBynavn'
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

DROP TYPE IF EXISTS operation_type CASCADE;
DROP TABLE IF EXISTS transaction_history CASCADE;
create type operation_type as enum('insert', 'update', 'delete');

DROP TYPE IF EXISTS dar1_status CASCADE;

DROP TYPE IF EXISTS dar_tx_source CASCADE;

DROP   TEXT SEARCH CONFIGURATION IF EXISTS adresser;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION adresser ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;

DROP   TEXT SEARCH CONFIGURATION IF EXISTS adresser_query;
CREATE TEXT SEARCH CONFIGURATION adresser_query (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION adresser_query ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;
