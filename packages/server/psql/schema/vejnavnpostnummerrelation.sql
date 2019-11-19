DROP VIEW IF EXISTS vejnavnpostnummerrelation_view CASCADE;

CREATE VIEW vejnavnpostnummerrelation_view AS (
    WITH aggregated AS (select postnr, vejnavn, st_union(geom) as geom
    FROM navngivenvejpostnummerrelation nvp
    JOIN dar1_navngivenvej_current nv on nvp.navngivenvej_id = nv.id
    GROUP BY vejnavn,postnr)
    select aggregated.*, vejnavn || ', ' || formatPostnr(p.nr) || ' ' || p.navn as betegnelse, p.navn as postnrnavn
FROM aggregated JOIN postnumre p ON aggregated.postnr = p.nr);