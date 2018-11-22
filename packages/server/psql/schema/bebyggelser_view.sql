DROP VIEW IF EXISTS bebyggelser_view CASCADE;

CREATE VIEW bebyggelser_view AS (
  SELECT
    s.id,
    sn.navn,
    s.hovedtype,
    s.undertype     AS type,
    sn.navnestatus,
    bebyggelseskode AS kode,
    s.visueltcenter,
    s.ændret,
    s.geo_ændret,
    s.geo_version,
    s.geom
  FROM steder s
    JOIN stednavne sn ON s.id = sn.stedid AND sn.brugsprioritet = 'primær'
  WHERE s.hovedtype = 'Bebyggelse'
);