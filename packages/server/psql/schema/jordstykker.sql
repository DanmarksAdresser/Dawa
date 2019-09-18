DROP VIEW IF EXISTS jordstykker_view CASCADE;
CREATE VIEW jordstykker_view AS (
    SELECT ejerlavkode,
           e.navn                                    as ejerlavnavn,
           matrikelnr,
           kommunekode,
           sognekode,
           regionskode,
           retskredskode,
           (er.ejendomsnummer)::text AS esrejendomsnr,
           to_char(kommunekode, 'FM000') ||
           to_char(er.ejendomsnummer::integer, 'FM0000000') AS udvidet_esrejendomsnr,
           grund_id,
           ejendomsrelation_id,
           sfeejendomsnr,
           er.bfenummer,
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
             LEFT JOIN LATERAL (SELECT er.bfenummer, er.ejendomsnummer, g.id as grund_id, er.id as ejendomsrelation_id
                                FROM bbr_grundjordstykke_current gj
                                         JOIN bbr_grund_current g ON gj.grund = g.id
                                         JOIN bbr_ejendomsrelation_current er
                                              ON g.bestemtfastejendom = er.id
                                WHERE gj.jordstykke = j.featureid
                                LIMIT 1
        ) er ON true
);