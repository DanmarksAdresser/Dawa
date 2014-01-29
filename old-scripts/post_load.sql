-- SQL commands to perform after data has been loaded

-- HACK, to deal with incorrect source data
update adgangsadresser set ejerlavnavn = 'DEN NORDVESTLIGE DEL, HØRBY' where ejerlavkode = 550755;
update adgangsadresser set ejerlavnavn = 'GØDSBØL, LINDEBALLE' where ejerlavkode = 1130653;

-- populate ejerlav table
insert into ejerlav select ejerlavkode, ejerlavnavn from adgangsadresser where ejerlavkode <> 0 group by ejerlavkode, ejerlavnavn;

-- Create search config for address search
-- Registrer vejnavne-synonymer
CREATE TEXT SEARCH DICTIONARY vejnavne_synonym(template=synonym, synonyms=vejnavne_synonym);

-- Registrer vejnavne-accenter
CREATE TEXT SEARCH DICTIONARY vejnavne_unaccent(template=unaccent, rules=vejnavne_unaccent);

CREATE TEXT SEARCH CONFIGURATION vejnavne (copy=simple);

ALTER TEXT SEARCH CONFIGURATION vejnavne ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword WITH vejnavne_unaccent, vejnavne_synonym, simple;

-- fuldtekstsoegning enhedsadresser
-- opret kolonne til tsvector
ALTER TABLE Enhedsadresser ADD COLUMN tsv tsvector;

-- populer tsvectors
UPDATE enhedsadresser
set tsv = to_tsvector('vejnavne', coalesce(etage, '') || ' ' || coalesce(doer, '') || ' ' || coalesce(postnumre.navn, '') || ' ' || coalesce(vejnavne.vejnavn, '') ||  ' ' || coalesce(to_char(postnumre.nr,'0000'), '') || ' ' || coalesce(husnr, ''))
from adgangsadresser, vejnavne, postnumre
where enhedsadresser.adgangsadresseid = adgangsadresser.id and adgangsadresser.vejkode = vejnavne.kode and adgangsadresser.kommunekode = vejnavne.kommunekode and adgangsadresser.postnr = postnumre.nr;

-- create full text search index
CREATE INDEX enhedsadresser_tsv ON enhedsadresser USING gin(tsv);

-- fuldtekstsoegning vejnavne
ALTER TABLE Vejnavne ADD COLUMN tsv tsvector;
UPDATE vejnavne SET tsv = to_tsvector('vejnavne', coalesce(vejnavn, ''));
CREATE INDEX vejnavne_tsv ON vejnavne USING gin(tsv);

-- fuldtekstsoegning postnumre
ALTER TABLE postnumre ADD COLUMN tsv tsvector;
UPDATE postnumre SET tsv = to_tsvector('vejnavne', coalesce(to_char(nr,'0000'), '') || ' ' || coalesce(navn, ''));
CREATE INDEX postnumre_tsv ON postnumre USING gin(tsv);


-- GIS opsaetning for wgs84 coordinater
ALTER TABLE Adgangsadresser ADD COLUMN geom geometry;
UPDATE Adgangsadresser SET geom = wgs84::geometry; -- tager nogle minutter
CREATE INDEX adgangsadresser_geom_index ON Adgangsadresser USING GIST (geom);

DROP VIEW Adresser;
CREATE OR REPLACE VIEW Adresser AS
SELECT
       E.id       AS enhedsadresseid,
       E.version  AS e_version,
       E.oprettet AS e_oprettet,
       E.aendret  AS e_aendret,
-- TODO      E.tsv      AS e_tsv,
       E.etage,
       E.doer,

       A.id AS adgangsadresseid,
       A.version AS a_version,
       A.husnr,
       A.matrikelnr,
       A.oprettet AS a_oprettet,
       A.aendret  AS a_aendret,
       A.etrs89oest AS oest,
       A.etrs89nord AS nord,
       ST_x(A.geom) AS bredde,
       ST_y(A.geom) as laengde,

       P.nr   AS postnr,
       P.navn AS postnrnavn,

       V.kode    AS vejkode,
       V.vejnavn AS vejnavn,

       LAV.kode AS ejerlavkode,
       LAV.navn AS ejerlavnavn,

       K.kode AS kommunekode,
       K.navn AS kommunenavn

FROM Enhedsadresser  AS E
JOIN Adgangsadresser AS A   ON (E.adgangsadresseid = A.id)
JOIN Vejnavne        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
JOIN Postnumre       AS P   ON (A.postnr = P.nr)
JOIN Kommuner        AS K   ON (A.kommunekode = K.kode)
JOIN ejerlav         AS LAV ON (A.ejerlavkode = LAV.kode);

CREATE INDEX Adgangsadresser_kommunekode_vejkode ON Adgangsadresser(kommunekode, vejkode);
