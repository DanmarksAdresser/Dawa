DROP VIEW IF EXISTS adresser CASCADE;
CREATE OR REPLACE VIEW adresser AS
  SELECT
    A.id as e_id,
    A.objekttype as e_objekttype,
    A.oprettet as e_oprettet,
    A.ikraftfra as e_ikraftfra,
    A.aendret as e_aendret,
    A.etage,
    A.doer,
    A.adgangspunktkilde as kilde,
    A.adgangsadresseid as a_id,
    A.objekttype as a_objekttype,
    A.husnr,
    A.supplerendebynavn,
    a_oprettet,
    a_ikraftfra,
    a_aendret,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.hoejde,
    A.geom       AS geom,
    A.noejagtighed,
    A.tekniskstandard,
    A.tekstretning,
    '100m_' || (floor(A.etrs89nord / 100))::text || '_' || (floor(etrs89oest / 100))::text as ddkn_m100,
    '1km_' || (floor(A.etrs89nord / 1000))::text || '_' || (floor(etrs89oest / 1000))::text as ddkn_km1,
    '10km_' || (floor(A.etrs89nord / 10000))::text || '_' || (floor(etrs89oest / 10000))::text as ddkn_km10,
    A.adressepunktaendringsdato,

    A.postnr,
    A.postnrnavn,

    A.stormodtagerpostnr,
    A.stormodtagerpostnrnavn,

    A.vejkode,
    A.vejnavn,
    A.adresseringsvejnavn,

    A.kommunekode AS kommunekode,
    K.navn AS kommunenavn,
    R.kode AS regionskode,
    R.navn AS regionsnavn,
    A.ejerlavkode,
    A.ejerlavnavn,
    A.matrikelnr,
    A.esrejendomsnr,
    JA.ejerlavkode as jordstykke_ejerlavkode,
    JA.matrikelnr as jordstykke_matrikelnr,
    JS_E.navn as jordstykke_ejerlavnavn,
    J.esrejendomsnr as jordstykke_esrejendomsnr,
    J.sfeejendomsnr,
    array_to_json((select array_agg(CAST((D.tema, D.fields) AS tema_data)) FROM adgangsadresser_temaer_matview DR
      JOIN temaer D  ON (DR.adgangsadresse_id = A.adgangsadresseid AND D.tema = DR.tema AND D.id = DR.tema_id))) AS temaer,
    COALESCE((select json_agg(CAST((b.id, b.kode, b.type, b.navn) AS BebyggelseRef)) FROM bebyggelser_adgadr ba
      JOIN bebyggelser b ON ba.bebyggelse_id = b.id WHERE ba.adgangsadresse_id = A.adgangsadresseid),'[]'::json)  as bebyggelser,
    A.tsv as e_tsv

  FROM adresser_mat A
    LEFT JOIN jordstykker_adgadr JA ON JA.adgangsadresse_id = A.adgangsadresseid
    LEFT JOIN jordstykker J ON JA.ejerlavkode = J.ejerlavkode AND JA.matrikelnr = J.matrikelnr
    LEFT JOIN Ejerlav JS_E ON JA.ejerlavkode = JS_E.kode
    LEFT JOIN kommuner K ON A.kommunekode = k.kode
    LEFT JOIN regioner R ON R.kode = K.regionskode;


CREATE OR REPLACE FUNCTION adressebetegnelse(vejnavn VARCHAR, husnr husnr, etage VARCHAR, dør VARCHAR, supplerendebynavn VARCHAR, postnr VARCHAR, postnrnavn VARCHAR)
  RETURNS varchar AS
  $$
  DECLARE
    betegnelse varchar;
  BEGIN
    betegnelse := COALESCE(vejnavn, '');
    IF husnr IS NOT NULL THEN
      betegnelse := betegnelse || ' ' || formatHusnr(husnr);
    END IF;
    IF etage IS NOT NULL OR dør IS NOT NULL THEN
      betegnelse := betegnelse || ',';
      IF etage IS NOT NULL THEN
        betegnelse := betegnelse || ' ' || etage || '.';
      END IF;
      IF dør IS NOT NULL THEN
        betegnelse := betegnelse || ' ' || dør;
      END IF;
    END IF;
    betegnelse := betegnelse || ', ';
    IF supplerendebynavn IS NOT NULL THEN
      betegnelse := betegnelse || supplerendebynavn || ', ';
    END IF;
    IF postnr IS NOT NULL THEN
      betegnelse := betegnelse || postnr;
    END IF;
    IF postnrnavn IS NOT NULL THEN
      betegnelse := betegnelse || ' ' || postnrnavn;
    END IF;
    RETURN betegnelse;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
