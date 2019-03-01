CREATE VIEW steder_geom_view AS(
    SELECT id, geom, geom_blobref FROM steder
);