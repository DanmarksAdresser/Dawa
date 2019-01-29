DROP VIEW IF EXISTS adresser CASCADE;
CREATE OR REPLACE VIEW adresser AS
  SELECT
    A.id as e_id,
    A.objekttype as e_objekttype,
    A.oprettet as e_oprettet,
    A.ikraftfra as e_ikraftfra,
    A.aendret as e_aendret,
    A.nedlagt as e_nedlagt,
    A.etage,
    A.doer,
    A.adgangspunktkilde as kilde,
    A.adgangsadresseid as a_id,
    A.objekttype as a_objekttype,
    A.husnr,
    A.supplerendebynavn,
    A.supplerendebynavn_dagi_id,
    a_oprettet,
    a_ikraftfra,
    a_aendret,
    a_nedlagt,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.hoejde,
    A.adgangspunktid,
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
    T.afstemningsområdenummer,
    T.afstemningsområdenavn,
    T.kommunenavn,
    T.regionskode,
    T.regionsnavn,
    t.sognekode,
    t.sognenavn,
    t.politikredskode,
    t.politikredsnavn,
    T.retskredskode,
    T.retskredsnavn,
    T.opstillingskredskode,
    T.opstillingskredsnavn,
    T.zone,
    T.menighedsrådsafstemningsområdenummer,
    T.menighedsrådsafstemningsområdenavn,
    A.ejerlavkode,
    A.ejerlavnavn,
    A.matrikelnr,
    A.esrejendomsnr,
    JA.ejerlavkode as jordstykke_ejerlavkode,
    JA.matrikelnr as jordstykke_matrikelnr,
    JS_E.navn as jordstykke_ejerlavnavn,
    J.esrejendomsnr as jordstykke_esrejendomsnr,
    J.sfeejendomsnr,
    A.vejpunkt_id,
    A.vejpunkt_kilde,
    A.vejpunkt_noejagtighedsklasse,
    A.vejpunkt_tekniskstandard,
    A.vejpunkt_ændret,
    A.vejpunkt_geom,
    A.navngivenvej_id,
    NOT EXISTS(SELECT * FROM ikke_brofaste_adresser iba where A.adgangsadresseid = iba.adgangsadresseid) as brofast,
    COALESCE((select json_agg(CAST((b.id, b.kode, b.type, b.navn) AS BebyggelseRef)) FROM stedtilknytninger ba
      JOIN bebyggelser_view b ON ba.stedid = b.id WHERE  ba.adgangsadresseid = A.adgangsadresseid),'[]'::json)  as bebyggelser,
    A.tsv as e_tsv

  FROM adresser_mat A
    LEFT JOIN jordstykker_adgadr JA ON JA.adgangsadresse_id = A.adgangsadresseid
    LEFT JOIN jordstykker J ON JA.ejerlavkode = J.ejerlavkode AND JA.matrikelnr = J.matrikelnr
    LEFT JOIN Ejerlav JS_E ON JA.ejerlavkode = JS_E.kode
    LEFT JOIN tilknytninger_mat t ON A.adgangsadresseid = T.adgangsadresseid;


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
