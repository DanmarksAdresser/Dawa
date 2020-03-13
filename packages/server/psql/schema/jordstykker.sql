DROP VIEW IF EXISTS jordstykker_view CASCADE;
CREATE VIEW jordstykker_view AS
(
SELECT ejerlavkode,
       e.navn                                           as ejerlavnavn,
       matrikelnr,
       kommunekode,
       sognekode,
       regionskode,
       retskredskode,
       (er.ejendomsnummer)::integer::text                        AS esrejendomsnr,
       to_char(kommunekode, 'FM000') ||
       to_char(er.ejendomsnummer::integer, 'FM0000000') AS udvidet_esrejendomsnr,
       grund_id,
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
         LEFT JOIN LATERAL (SELECT g.esrejdnr as ejendomsnummer, g.grund_id
                            FROM ois_grund g
                                     JOIN ois_matrikelreference mr ON g.grund_id = mr.grund_id
                            WHERE mr.landsejerlavkode = j.ejerlavkode
                              AND mr.matrnr = j.matrikelnr
                              AND g.ophoert_ts IS NULL
                              AND mr.ophoert_ts IS NULL
                            LIMIT 1
    ) er ON true
    );
