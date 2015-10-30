DROP FUNCTION IF EXISTS vask_adgangsadresser_update_tsv() CASCADE;
CREATE FUNCTION vask_adgangsadresser_update_tsv() RETURNS void
LANGUAGE sql AS
  $$
      UPDATE vask_adgangsadresser SET tsv = (
          setweight(to_tsvector('adresser', vejnavn || ' ' || (husnr).tal || (husnr).bogstav), 'A') ||
          setweight(to_tsvector('adresser', processForIndexing(COALESCE(supplerendebynavn, ''))), 'C') ||
          setweight(to_tsvector('adresser', to_char(postnr, 'FM0000') || ' ' || postnrnavn), 'D')
      );
$$;
