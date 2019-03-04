DROP VIEW IF EXISTS hoejde_importer_afventer_view CASCADE;
create view hoejde_importer_afventer_view AS(
  SELECT hn.id as husnummerid, ap.id as adgangspunktid from dar1_husnummer_current hn
    JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
    LEFT JOIN hoejde_importer_resultater r ON r.husnummerid = hn.id
  WHERE r.position is null or  st_distance(r.position, ap.position) > 0.1
);

DROP VIEW IF EXISTS hoejder_view CASCADE;
CREATE VIEW hoejder_view AS(
    select husnummerid, hoejde FROM hoejde_importer_resultater JOIN dar1_husnummer_current hn ON husnummerid = hn.id
);