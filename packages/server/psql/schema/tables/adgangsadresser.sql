DROP TABLE IF EXISTS adgangsadresser CASCADE;
CREATE TABLE  adgangsadresser (
  id uuid NOT NULL PRIMARY KEY,
  kommunekode INTEGER NOT NULL,
  vejkode INTEGER NOT NULL,
  husnr husnr,
  supplerendebynavn VARCHAR(34) NULL,
  postnr INTEGER NULL,
  ejerlavkode INTEGER,
  matrikelnr VARCHAR(7) NULL,
  esrejendomsnr integer NULL,
  objekttype smallint,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  adgangspunktid uuid,
  etrs89oest double precision NULL,
  etrs89nord double precision NULL,
  noejagtighed CHAR(1) NULL,
  adgangspunktkilde smallint NULL,
  husnummerkilde smallint,
  placering smallint,
  tekniskstandard CHAR(2) NULL,
  tekstretning numeric(5,2) NULL,
  adressepunktaendringsdato timestamp NULL,
  esdhReference text,
  journalnummer text,
  hoejde double precision NULL,
  navngivenvej_id uuid,
  navngivenvejkommunedel_id uuid,
  supplerendebynavn_id uuid,
  darkommuneinddeling_id uuid,
  adressepunkt_id uuid,
  postnummer_id uuid,
  supplerendebynavn_dagi_id integer,
  vejpunkt_id UUID
);

CREATE INDEX ON Adgangsadresser(ejerlavkode, id);
CREATE INDEX ON Adgangsadresser(kommunekode, vejkode, postnr);
CREATE INDEX ON adgangsadresser(postnr, kommunekode);
CREATE INDEX ON adgangsadresser(navngivenvej_id);
CREATE INDEX ON adgangsadresser(navngivenvejkommunedel_id);
CREATE INDEX ON adgangsadresser(supplerendebynavn_id);
CREATE INDEX ON adgangsadresser(darkommuneinddeling_id);
CREATE INDEX ON adgangsadresser(adressepunkt_id);
CREATE INDEX ON adgangsadresser(vejpunkt_id);
CREATE INDEX ON adgangsadresser(navngivenvejkommunedel_id, postnummer_id, id);



DROP TABLE IF EXISTS adgangsadresser_history CASCADE;
