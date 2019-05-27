DROP VIEW IF EXISTS tilknytninger_mat_view;
CREATE VIEW tilknytninger_mat_view AS (
  SELECT a.id                         AS adgangsadresseid,
         k.kode                       AS kommunekode,
         k.navn                       AS kommunenavn,
         reg.kode                     AS regionskode,
         reg.navn                     AS regionsnavn,
         s.sognekode,
         s.navn                       AS sognenavn,
         pt.politikredskode,
         p.navn                       AS politikredsnavn,
         rt.retskredskode,
         r.navn                       AS retskredsnavn,
         ao.afstemningsområdenummer   AS afstemningsområdenummer,
         ao.afstemningsområde         AS afstemningsområde_dagi_id,
         aom.navn                     AS afstemningsområdenavn,
         o.kode                       AS opstillingskredskode,
         o.navn                       AS opstillingskredsnavn,
         v.bogstav                    AS valglandsdelsbogstav,
         v.navn                       AS valglandsdelsnavn,
         stor.nummer                  AS storkredsnummer,
         stor.navn                    AS storkredsnavn,
         zt.zone,
         mr.mrafstemningsområdenummer AS menighedsrådsafstemningsområdenummer,
         mr.navn                      AS menighedsrådsafstemningsområdenavn,
         lt.nuts3                     AS landsdelsnuts3,
         l.navn                       AS landsdelsnavn
  FROM adgangsadresser_mat a
         JOIN dar1_husnummer_current hn ON a.id = hn.id
         LEFT JOIN dar1_darsogneinddeling_current s ON hn.darsogneinddeling_id = s.id
         LEFT JOIN dar1_darafstemningsområde_current ao
                   ON hn.darafstemningsområde_id = ao.id
         LEFT JOIN politikredstilknytninger pt ON a.id = pt.adgangsadresseid
         LEFT JOIN politikredse p ON pt.politikredskode = p.kode
         LEFT JOIN retskredstilknytninger rt ON a.id = rt.adgangsadresseid
         LEFT JOIN retskredse r ON rt.retskredskode = r.kode
         LEFT JOIN kommuner k ON a.kommunekode = k.kode
         LEFT JOIN regioner reg ON k.regionskode = reg.kode
         LEFT JOIN afstemningsomraader aom ON ao.afstemningsområde = aom.dagi_id
         LEFT JOIN opstillingskredse o ON aom.opstillingskreds_dagi_id = o.dagi_id
         LEFT JOIN storkredse stor ON o.storkredsnummer = stor.nummer
         LEFT JOIN valglandsdele v ON stor.valglandsdelsbogstav = v.bogstav
         LEFT JOIN zonetilknytninger zt ON a.id = zt.adgangsadresseid
         LEFT JOIN dar1_darmenighedsrådsafstemningsområde_current mr
                   ON hn.darmenighedsrådsafstemningsområde_id = mr.id
         LEFT JOIN landsdelstilknytninger lt ON a.id = lt.adgangsadresseid
         LEFT JOIN landsdele l ON lt.nuts3 = l.nuts3
);
