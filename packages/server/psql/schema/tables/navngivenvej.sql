DROP TABLE IF EXISTS navngivenvej CASCADE;
CREATE TABLE navngivenvej(
  id uuid primary key,
  darstatus smallint not null,
  oprettet timestamptz not null,
  ændret timestamptz not null,
  navn text not null,
  adresseringsnavn text not null,
  administrerendekommune smallint,
  beskrivelse text,
  retskrivningskontrol text,
  udtaltvejnavn text,
  beliggenhed_oprindelse_kilde text,
  beliggenhed_oprindelse_nøjagtighedsklasse text,
  beliggenhed_oprindelse_registrering timestamptz,
  beliggenhed_oprindelse_tekniskstandard text
);