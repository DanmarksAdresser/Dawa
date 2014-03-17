
DROP TABLE IF EXISTS AdgangsadresserDagiRel CASCADE;
CREATE TABLE AdgangsAdresserDagiRel(
  adgangsadresseid uuid not null,
  dagitema DagiTemaType not null,
  dagikode integer not null,
  primary key(adgangsadresseid, dagitema, dagikode)
);

CREATE INDEX ON AdgangsadresserDagiRel(dagiTema, dagiKode, adgangsadresseid);
