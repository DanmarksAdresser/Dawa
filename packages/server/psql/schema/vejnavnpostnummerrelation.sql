DROP VIEW IF EXISTS vejnavnpostnummerrelation_view CASCADE;

CREATE VIEW vejnavnpostnummerrelation_view AS (
    with intersections as
             (select nv.id                                                                    as navngivenvej_id,
                     vejnavn,
                     p_div.nr                                                                 as postnr,
                     ST_INTERSECTION(p.geom, coalesce(nv.vejnavnebeliggenhed_vejnavnelinje,
                                                      nv.vejnavnebeliggenhed_vejnavneområde)) as intersection
              FROM dar1_navngivenvej_current nv
                       JOIN LATERAL (select distinct p.nr
                                     from dagi_postnumre_divided p
                                     where st_intersects(p.geom,
                                                         coalesce(nv.vejnavnebeliggenhed_vejnavnelinje,
                                                                  nv.vejnavnebeliggenhed_vejnavneområde))
                                       and (st_length(st_intersection(nv.vejnavnebeliggenhed_vejnavnelinje, p.geom)) > 7
                                         or st_area(st_intersection(nv.vejnavnebeliggenhed_vejnavneområde, p.geom)) > 7)
                  ) p_div on true
                       JOIN dagi_postnumre p on p_div.nr = p.nr
              where nv.status = 3),
         addr_relations as (select distinct navngivenvej_id,
                                            vejnavn,
                                            postnr,
                                            null::geometry(Geometry,
                                                25832) as intersection
                            FROM adgangsadresser_mat
                            where status = 3),
         aggregated as (select vejnavn,
                               postnr,
                               st_union(intersection)::geometry(geometry, 25832) as geom
                        from ((select * from intersections) union (select * from addr_relations)) t
                        group by vejnavn, postnr)
    select aggregated.*, p.navn as postnrnavn
    FROM aggregated
             left join postnumre p
                       on aggregated.postnr = p.nr);