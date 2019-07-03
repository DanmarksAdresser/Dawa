DROP VIEW IF EXISTS jordstykker_view CASCADE;
CREATE VIEW jordstykker_view AS (
    SELECT ejerlavkode,
           e.navn                                                                     as ejerlavnavn,
           matrikelnr,
           kommunekode,
           sognekode,
           regionskode,
           retskredskode,
           (g.esrejdnr::integer)::text                                                AS esrejendomsnr,
           to_char(kommunekode, 'FM000') ||
           to_char(g.esrejdnr::integer, 'FM0000000')                                  AS udvidet_esrejendomsnr,
           sfeejendomsnr,
           j.geom,
           featureid,
           moderjordstykke,
           registreretareal,
           arealberegningsmetode,
           vejareal,
           vejarealberegningsmetode,
           vandarealberegningsmetode,
           fælleslod
    FROM matrikel_jordstykker j
             LEFT JOIN ejerlav e ON j.ejerlavkode = e.kode
             LEFT JOIN LATERAL (select *
                                from ois_matrikelreference mr
                                         LEFT JOIN ois_grund g
                                                   ON mr.grund_id = g.grund_id AND g.ophoert_ts is null
                                WHERE mr.ophoert_ts is null
                                  AND j.ejerlavkode = mr.landsejerlavkode
                                  AND j.matrikelnr = mr.matrnr
                                limit 1) mr ON true
);