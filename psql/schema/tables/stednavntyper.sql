DROP MATERIALIZED VIEW IF EXISTS stednavntyper;
create materialized view stednavntyper AS (select distinct hovedtype, undertype FROM stednavne);
create unique index on stednavntyper(hovedtype);
