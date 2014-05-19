-- tekstretning konverteres fra GON til grader, og det sikres at vinklen er indenfor +/- 90.
CREATE OR REPLACE VIEW wms_adgangsadresser AS
  SELECT
    id                                                                            AS AddressAccessIdentifier,
    husnr                                                                         AS StreetBuildingIdentifier,
    (round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90) % 180 - 90)) :: INTEGER AS Angle360,
    geom
  FROM adgangsadresser;

CREATE OR REPLACE VIEW wfs_adgangsadresser AS
  SELECT
    id                        AS AddressAccessIdentifier,
    kommunekode               AS MunicipalityCode,
    vejkode                   AS StreetCode,
    vejnavn                   AS StreetName,
    husnr                     AS StreetBuildingIdentifier,
    supplerendebynavn         AS DistrictSubdivisionIdentifier,
    postnr                    AS PostCodeIdentifier,
    postnrnavn                AS DistrictName,
    ejerlavkode               AS CadastralDistrictIdentifier,
    ejerlavnavn               AS CadastralDistrictName,
    matrikelnr                AS LandParcelIdentifier,
    esrejendomsnr             AS MunicipalRealPropertyIdentifier,
    oprettet                  AS AddressAccessCreateDate,
    ikraftfra                 AS AddressAccessValidDate,
    aendret                   AS AddressAccessChangeDate,
    etrs89oest                AS GeographicEastingMeasure,
    etrs89nord                AS GeographicNorthingMeasure,
    noejagtighed              AS AddressCoordinateQualityClassCode,
    kilde                     AS AddressGeometrySourceCode,
    tekniskstandard           AS AddressCoordinateTechnicalStandardCode,
    tekstretning              AS AddressTextAngleMeasure,
    kn100mdk                  AS GeometryDDKNcell100mText,
    kn1kmdk                   AS GeometryDDKNcell1kmText,
    kn10kmdk                  AS GeometryDDKNcell10kmText,
    adressepunktaendringsdato AS AddressPointRevisionDateTime,
    geom
  FROM adgangsadresser;

CREATE OR REPLACE VIEW wfs_adresser AS
  SELECT
    e_id                      AS AddressIdentifier,
    etage                     AS FloorIdentifier,
    doer                      AS SuiteIdentifier,
    e_oprettet                AS AddressSpecificCreateDate,
    e_ikraftfra               AS AddressSpecificValidDate,
    e_aendret                 AS AddressSpecificChangeDate,
    a_id                      AS AddressAccessIdentifier,
    kommunekode               AS MunicipalityCode,
    vejkode                   AS StreetCode,
    vejnavn                   AS StreetName,
    husnr                     AS StreetBuildingIdentifier,
    supplerendebynavn         AS DistrictSubdivisionIdentifier,
    postnr                    AS PostCodeIdentifier,
    postnrnavn                AS DistrictName,
    ejerlavkode               AS CadastralDistrictIdentifier,
    ejerlavnavn               AS CadastralDistrictName,
    matrikelnr                AS LandParcelIdentifier,
    esrejendomsnr             AS MunicipalRealPropertyIdentifier,
    a_oprettet                AS AddressAccessCreateDate,
    a_ikraftfra               AS AddressAccessValidDate,
    a_aendret                 AS AddressAccessChangeDate,
    oest                      AS GeographicEastingMeasure,
    nord                      AS GeographicNorthingMeasure,
    noejagtighed              AS AddressCoordinateQualityClassCode,
    kilde                     AS AddressGeometrySourceCode,
    tekniskstandard           AS AddressCoordinateTechnicalStandardCode,
    tekstretning              AS AddressTextAngleMeasure,
    kn100mdk                  AS GeometryDDKNcell100mText,
    kn1kmdk                   AS GeometryDDKNcell1kmText,
    kn10kmdk                  AS GeometryDDKNcell10kmText,
    adressepunktaendringsdato AS AddressPointRevisionDateTime,
    geom
  FROM Adresser;
