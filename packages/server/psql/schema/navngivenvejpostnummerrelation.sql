DROP VIEW IF EXISTS navngivenvejpostnummerrelation_view CASCADE;

CREATE VIEW navngivenvejpostnummerrelation_view AS (
    with intersections as
             (select nv.id                                                                    as navngivenvej_id,
                     p_div.nr                                                                 as postnr,
                     ST_INTERSECTION(p.geom, coalesce(nv.vejnavnebeliggenhed_vejnavnelinje,
                                                      nv.vejnavnebeliggenhed_vejnavneområde)) as geom
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
                                            postnr,
                                            null::geometry(Geometry,
                                                25832) as geom
                            FROM adgangsadresser_mat
                            where status = 3),
         unioned as (select * from intersections union select * from addr_relations)
    select navngivenvej_id,postnr,st_union(geom) as geom from unioned group by navngivenvej_id,postnr);