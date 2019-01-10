DROP VIEW IF EXISTS AdgangsadresserView CASCADE;
CREATE OR REPLACE VIEW AdgangsadresserView AS
  SELECT
    A.id as a_id,
    A.objekttype as a_objekttype,
    A.husnr,
    A.supplerendebynavn,
    A.supplerendebynavn_dagi_id,
    A.oprettet AS a_oprettet,
    A.ikraftfra as a_ikraftfra,
    A.aendret  AS a_aendret,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.hoejde,
    A.geom       AS geom,
    A.noejagtighed,
    A.adgangspunktkilde AS kilde,
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
    T.kommunenavn,
    T.regionskode,
    T.regionsnavn,
    t.sognekode,
    t.sognenavn,
    t.politikredskode,
    t.politikredsnavn,
    T.retskredskode,
    T.retskredsnavn,
    t.afstemningsområdenummer,
    t.afstemningsområdenavn,
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
    A.adgangspunktid,
    A.vejpunkt_id,
    A.vejpunkt_kilde,
    A.vejpunkt_noejagtighedsklasse,
    A.vejpunkt_tekniskstandard,
    A.vejpunkt_ændret,
    A.vejpunkt_geom,
    A.navngivenvej_id,
    (NOT EXISTS(SELECT * FROM ikke_brofaste_adresser iba where A.id = iba.adgangsadresseid)) as brofast,
    COALESCE((select json_agg(CAST((b.id, b.kode, b.type, b.navn) AS BebyggelseRef)) FROM stedtilknytninger ba
      JOIN bebyggelser_view b ON ba.stedid = b.id WHERE  ba.adgangsadresseid = A.id),'[]'::json)  as bebyggelser,
    A.tsv

  FROM adgangsadresser_mat A
    LEFT JOIN jordstykker_adgadr JA ON JA.adgangsadresse_id = A.id
    LEFT JOIN jordstykker J ON JA.ejerlavkode = J.ejerlavkode AND JA.matrikelnr = J.matrikelnr
    LEFT JOIN Ejerlav JS_E ON JA.ejerlavkode = JS_E.kode
    LEFT JOIN tilknytninger_mat t ON A.id = T.adgangsadresseid;

CREATE VIEW adgangsadresser_valid_view AS SELECT * from adgangsadresserview WHERE postnr IS NOT NULL AND husnr IS NOT NULL;
