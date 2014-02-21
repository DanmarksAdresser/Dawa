
\set ON_ERROR_STOP on
\set ECHO queries

BEGIN;

DROP VIEW IF EXISTS Adresser;
DROP VIEW IF EXISTS AdgangsadresserView;

alter table adgangsadresser alter column kn100mdk TYPE varchar(15);
alter table adgangsadresser alter column kn1kmdk TYPE varchar(15);
alter table adgangsadresser alter column kn10kmdk TYPE varchar(15);

update adgangsadresser set kn100mdk = trim(kn100mdk), kn1kmdk = trim(kn1kmdk), kn10kmdk = trim(kn10kmdk);

CREATE VIEW AdgangsadresserView AS
  SELECT
    A.id as a_id,
    A.version AS a_version,
    A.bygningsnavn,
    A.husnr,
    A.supplerendebynavn,
    A.matrikelnr,
    A.esrejendomsnr,
    A.oprettet AS a_oprettet,
    A.ikraftfra as a_ikraftfra,
    A.aendret  AS a_aendret,
    A.etrs89oest::double precision AS oest,
    A.etrs89nord::double precision AS nord,
    A.wgs84lat::double precision   AS lat,
    A.wgs84long::double precision  AS long,
    A.wgs84,
    A.geom       AS wgs84geom,
    A.noejagtighed,
    A.kilde::smallint,
    A.tekniskstandard,
    A.tekstretning::double precision,
    A.kn100mdk,
    A.kn1kmdk,
    A.kn10kmdk,
    A.adressepunktaendringsdato,

    P.nr   AS postnr,
    P.navn AS postnrnavn,

    V.kode    AS vejkode,
    V.vejnavn AS vejnavn,

    LAV.kode AS ejerlavkode,
    LAV.navn AS ejerlavnavn,

    K.kode AS kommunekode,
    K.navn AS kommunenavn,
    A.tsv

  FROM adgangsadresser A
    LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
    LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
    LEFT JOIN Kommuner        AS K   ON (A.kommunekode = K.kode)
    LEFT JOIN ejerlav         AS LAV ON (A.ejerlavkode = LAV.kode);

CREATE VIEW adresser AS
  SELECT
    E.id        AS e_id,
    E.version   AS e_version,
    E.oprettet  AS e_oprettet,
    E.ikraftfra AS e_ikraftfra,
    E.aendret   AS e_aendret,
    E.tsv       AS e_tsv,
    E.etage,
    E.doer,
    A.*
  FROM enhedsadresser E
    LEFT JOIN adgangsadresserView A  ON (E.adgangsadresseid = A.a_id);

COMMIT;
