ALTER TABLE stormodtagere
  ADD PRIMARY KEY (adgangsadresseid);

ALTER TABLE enhedsadresser
  ADD CONSTRAINT adgangsadresse_fk
FOREIGN KEY (adgangsadresseid)
REFERENCES adgangsadresser (id);

CREATE OR REPLACE VIEW adresser AS
  SELECT
    E.id        AS e_id,
    E.objekttype AS e_objekttype,
    E.oprettet  AS e_oprettet,
    E.ikraftfra AS e_ikraftfra,
    E.aendret   AS e_aendret,
    E.tsv       AS e_tsv,
    E.etage,
    E.doer,
    A.*
  FROM enhedsadresser E
    LEFT JOIN adgangsadresserView A  ON (E.adgangsadresseid = A.a_id);

CREATE OR REPLACE VIEW wfs_adgangsadresser AS
  SELECT
    a_id::varchar AS id,
    a_objekttype AS status,
    kommunekode,
    vejkode,
    vejnavn,
    formatHusnr(husnr) as husnr,
    supplerendebynavn,
    postnr,
    postnrnavn,
    jordstykke_ejerlavkode as ejerlavkode,
    jordstykke_ejerlavnavn as ejerlavnavn,
    jordstykke_matrikelnr as matrikelnr,
    jordstykke_esrejendomsnr as esrejendomsnr,
    a_oprettet                  AS "oprettet",
    a_ikraftfra                 AS "ikrafttrædelsesdato",
    a_aendret                   AS "ændret",
    oest                AS "etrs89koordinat_øst",
    nord                AS "etrs89koordinat_nord",
    noejagtighed              AS "nøjagtighed",
    kilde,
    tekniskstandard,
    tekstretning,
    ddkn_m100,
    ddkn_km1,
    ddkn_km10,
    adressepunktaendringsdato AS "adressepunktændringsdato",
    round((COALESCE(tekstretning, 200) * 0.9 + 360 + 90))::INTEGER % 180 - 90 AS "tekstretninggrader",
    geom
  FROM adgangsadresserview;
