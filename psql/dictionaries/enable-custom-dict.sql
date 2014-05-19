CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create search config for address search
-- Registrer vejnavne-synonymer
DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_synonym CASCADE;
CREATE TEXT SEARCH DICTIONARY adresser_synonym(template=synonym, synonyms=adresser_synonym);

-- Registrer vejnavne-accenter
DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_unaccent CASCADE;
CREATE TEXT SEARCH DICTIONARY adresser_unaccent(template=unaccent, rules=adresser_unaccent);

DROP TEXT SEARCH CONFIGURATION IF EXISTS adresser;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);

ALTER TEXT SEARCH CONFIGURATION adresser ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH adresser_unaccent, adresser_synonym, simple;
