
\set ON_ERROR_STOP on
\set ECHO queries

UPDATE vejstykker SET tsv = to_tsvector('danish', coalesce(vejnavn, ''));

UPDATE postnumre SET tsv = to_tsvector('danish', coalesce(to_char(nr,'0000'), '') || ' ' || coalesce(navn, ''));

UPDATE adgangsadresser
SET tsv = to_tsvector('danish',
                      coalesce(vejstykker.vejnavn, '') || ' '
                      || coalesce(husnr, '') || ' '
                      || coalesce(supplerendebynavn, '') || ' '
                      || coalesce(to_char(postnr, '0000'), '')
                      || coalesce(postnumre.navn, '') || ' ')
FROM
  postnumre, vejstykker
WHERE
  postnumre.nr = adgangsadresser.postnr AND vejstykker.kommunekode = adgangsadresser.kommunekode AND
  vejstykker.kode = adgangsadresser.vejkode;

UPDATE adgangsadresser SET wgs84 = ST_GeometryFromText('POINT('||wgs84long||' '||wgs84lat||')', 4326)
WHERE wgs84lat IS NOT NULL AND wgs84long IS NOT NULL;

UPDATE adgangsadresser SET geom = ST_SetSRID(ST_MakePoint(etrs89oest, etrs89nord), 25832);

UPDATE adgangsadresser SET ejerlavnavn = 'DEN NORDVESTLIGE DEL, HØRBY'
WHERE ejerlavkode = 550755;

UPDATE adgangsadresser SET ejerlavnavn = 'GØDSBØL, LINDEBALLE'
WHERE ejerlavkode = 1130653;

CREATE temp TABLE tmp  AS SELECT id,
                                 to_tsvector('danish',
                                                coalesce(etage,                  '') || ' ' || coalesce(doer,    '') || ' '
                                             || coalesce(postnrnavn,             '') || ' ' || coalesce(vejnavn, '') || ' '
                                             || coalesce(to_char(postnr,'0000'), '') || ' ' || coalesce(husnr,   ''))
         AS tsv
  FROM (SELECT e.id, etage, doer, p.navn as postnrnavn, v.vejnavn, p.nr as postnr, husnr
        FROM enhedsadresser e
        LEFT JOIN adgangsadresser a ON a.id = e.adgangsadresseid
        LEFT JOIN vejstykker v ON a.vejkode = v.kode AND a.kommunekode = v.kommunekode
        LEFT JOIN postnumre p ON  a.postnr = p.nr) as T;

UPDATE enhedsadresser AS e SET tsv = T.tsv from (select * from tmp) as T where e.id = T.id;

DROP TABLE tmp;


