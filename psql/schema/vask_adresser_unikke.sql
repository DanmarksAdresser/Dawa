DROP FUNCTION IF EXISTS vask_adresser_unikke_update_tsv() CASCADE;
CREATE FUNCTION vask_adresser_unikke_update_tsv() RETURNS void
LANGUAGE sql AS
$$
UPDATE vask_adresser_unikke SET tsv = (
  setweight(to_tsvector('adresser', processForIndexing(vejnavn) || ' ' || (husnr).tal || (husnr).bogstav), 'A') ||
  setweight(to_tsvector('adresser', processforindexing(COALESCE(etage, '') ||' ' || COALESCE(doer, ''))), 'B') ||
  setweight(to_tsvector('adresser', processForIndexing(COALESCE(supplerendebynavn, ''))), 'C') ||
  setweight(to_tsvector('adresser', to_char(postnr, 'FM0000') || ' ' || postnrnavn), 'D')
);
$$;
