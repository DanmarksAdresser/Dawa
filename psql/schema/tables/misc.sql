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
  'politikreds', 'retskreds', 'afstemningsområde', 'postdistrikt', 'danmark', 'afstemningsomraade','menighedsraadsafstemningsomraade','samlepostnummer','storkreds','supplerendebynavn','valglandsdel');

DROP TYPE IF EXISTS DagiTemaRef CASCADE;
CREATE TYPE DagiTemaRef AS (
  tema DagiTemaType,
  kode integer,
  navn varchar(255)
);

DROP   TEXT SEARCH CONFIGURATION IF EXISTS adresser;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION adresser ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;