
\set ON_ERROR_STOP on
\set ECHO queries

DROP   TEXT SEARCH CONFIGURATION IF EXISTS vejnavne;
CREATE TEXT SEARCH CONFIGURATION vejnavne (copy=simple);
ALTER  TEXT SEARCH CONFIGURATION vejnavne ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH simple;
