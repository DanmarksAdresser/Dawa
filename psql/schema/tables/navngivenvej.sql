DROP TABLE IF EXISTS navngivenvej CASCADE;
CREATE TABLE navngivenvej(
  id uuid primary key,
  darstatus smallint not null,
  oprettet timestamptz not null,
  ændret timestamptz not null,
  navn text not null,
  adresseringsnavn text not null,
  administreresafkommune smallint,
  beskrivelse text,
  retskrivningskontrol text,
  udtaltvejnavn text
);

CREATE INDEX ON navngivenvej(navn);
CREATE INDEX ON navngivenvej(adresseringsnavn);

DROP TABLE IF EXISTS navngivenvej_history CASCADE;
