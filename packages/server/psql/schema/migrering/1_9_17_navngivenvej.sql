DROP TABLE IF EXISTS navngivenvej CASCADE;

CREATE TABLE navngivenvej(
  id uuid primary key,
  darstatus smallint not null,
  oprettet timestamptz not null,
  ændret timestamptz not null,
  navn text not null,
  adresseringsnavn text not null,
  administreresafkommune text,
  beskrivelse text,
  retskrivningskontrol text,
  udtaltvejnavn text
);

CREATE TABLE navngivenvej_history(
  valid_from integer,
  valid_to integer,
  id uuid primary key,
  darstatus smallint not null,
  oprettet timestamptz not null,
  ændret timestamptz not null,
  navn text not null,
  adresseringsnavn text not null,
  administreresafkommune text,
  beskrivelse text,
  retskrivningskontrol text,
  udtaltvejnavn text
);

CREATE INDEX ON navngivenvej_history(valid_to);
CREATE INDEX ON navngivenvej_history(valid_from);
CREATE INDEX ON navngivenvej_history(id);

ALTER TABLE vejstykker ADD COLUMN navngivenvej_id uuid;

CREATE INDEX ON vejstykker(navngivenvej_id);

ALTER TABLE vejstykker_history ADD COLUMN navngivenvej_id uuid;
