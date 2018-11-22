CREATE TABLE vejpunkter(
  id UUID PRIMARY KEY,
  husnummerid uuid not null,
  kilde text not null,
  noejagtighedsklasse text not null,
  tekniskstandard text not null,
  geom geometry(Point,25832)
);

CREATE INDEX ON vejpunkter(husnummerid);

ALTER TABLE adgangsadresser_mat ADD COLUMN vejpunkt_id UUID;
ALTER TABLE adgangsadresser_mat ADD COLUMN vejpunkt_kilde text;
ALTER TABLE adgangsadresser_mat ADD COLUMN vejpunkt_noejagtighedsklasse text;
ALTER TABLE adgangsadresser_mat ADD COLUMN vejpunkt_tekniskstandard text;
ALTER TABLE adgangsadresser_mat ADD COLUMN vejpunkt_geom geometry(Point,25832);
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN vejpunkt_id UUID;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN vejpunkt_kilde text;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN vejpunkt_noejagtighedsklasse text;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN vejpunkt_tekniskstandard text;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN vejpunkt_geom geometry(Point,25832);

CREATE INDEX ON adgangsadresser_mat USING GIST(vejpunkt_geom);
CREATE INDEX ON adgangsadresser_mat(vejpunkt_id);

ALTER TABLE adresser_mat ADD COLUMN vejpunkt_id UUID;
ALTER TABLE adresser_mat ADD COLUMN vejpunkt_kilde text;
ALTER TABLE adresser_mat ADD COLUMN vejpunkt_noejagtighedsklasse text;
ALTER TABLE adresser_mat ADD COLUMN vejpunkt_tekniskstandard text;
ALTER TABLE adresser_mat ADD COLUMN vejpunkt_geom geometry(Point,25832);
ALTER TABLE adresser_mat_changes ADD COLUMN vejpunkt_id UUID;
ALTER TABLE adresser_mat_changes ADD COLUMN vejpunkt_kilde text;
ALTER TABLE adresser_mat_changes ADD COLUMN vejpunkt_noejagtighedsklasse text;
ALTER TABLE adresser_mat_changes ADD COLUMN vejpunkt_tekniskstandard text;
ALTER TABLE adresser_mat_changes ADD COLUMN vejpunkt_geom geometry(Point,25832);

CREATE INDEX ON adresser_mat USING GIST(vejpunkt_geom);
CREATE INDEX ON adresser_mat(vejpunkt_id);

CREATE TABLE vejpunkter_changes as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, vejpunkter.* FROM vejpunkter WHERE false);
ALTER TABLE vejpunkter_changes ALTER COLUMN txid SET NOT NULL;
ALTER TABLE vejpunkter_changes ALTER COLUMN operation SET NOT NULL;
ALTER TABLE vejpunkter_changes ALTER COLUMN public SET NOT NULL;
CREATE INDEX ON vejpunkter_changes(txid, operation);
CREATE INDEX ON vejpunkter_changes(changeid, public)
