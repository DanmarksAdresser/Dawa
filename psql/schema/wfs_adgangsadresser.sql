DROP VIEW IF EXISTS wfs_adgangsadresser CASCADE;

CREATE OR REPLACE VIEW wfs_adgangsadresser AS
  SELECT
    a_id::varchar               AS "AddressAccessIdentifier",
    kommunekode               AS "MunicipalityCode",
    vejkode                   AS "StreetCode",
    vejnavn                   AS "StreetName",
    husnr                     AS "StreetBuildingIdentifier",
    supplerendebynavn         AS "DistrictSubdivisionIdentifier",
    postnr                    AS "PostCodeIdentifier",
    postnrnavn                AS "DistrictName",
    ejerlavkode               AS "CadastralDistrictIdentifier",
    ejerlavnavn               AS "CadastralDistrictName",
    matrikelnr                AS "LandParcelIdentifier",
    esrejendomsnr             AS "MunicipalRealPropertyIdentifier",
    a_oprettet                  AS "AddressAccessCreateDate",
    a_ikraftfra                 AS "AddressAccessValidDate",
    a_aendret                   AS "AddressAccessChangeDate",
    oest                AS "GeographicEastingMeasure",
    nord                AS "GeographicNorthingMeasure",
    noejagtighed              AS "AddressCoordinateQualityClassCode",
    kilde                     AS "AddressGeometrySourceCode",
    tekniskstandard           AS "AddressCoordinateTechnicalStandardCode",
    tekstretning              AS "AddressTextAngleMeasure",
    kn100mdk                  AS "GeometryDDKNcell100mText",
    kn1kmdk                   AS "GeometryDDKNcell1kmText",
    kn10kmdk                  AS "GeometryDDKNcell10kmText",
    adressepunktaendringsdato AS "AddressPointRevisionDateTime",
    geom
  FROM AdgangsadresserView;
