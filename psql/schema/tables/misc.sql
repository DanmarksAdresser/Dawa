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

DROP   TEXT SEARCH CONFIGURATION IF EXISTS adresser;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION adresser ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;