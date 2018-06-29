DROP VIEW IF EXISTS tilknytninger_mat_view;
CREATE VIEW tilknytninger_mat_view AS (
  SELECT
    a.id      AS adgangsadresseid,
    k.kode    AS kommunekode,
    k.navn    AS kommunenavn,
    reg.kode  AS regionskode,
    reg.navn  AS regionsnavn,
    s.sognekode,
    s.navn    AS sognenavn,
    pt.politikredskode,
    p.navn    AS politikredsnavn,
    rt.retskredskode,
    r.navn    AS retskredsnavn,
    ao.afstemningsområdenummer AS afstemningsområdenummer,
    ao.navn   AS afstemningsområdenavn,
    ot.opstillingskredskode,
    o.navn    AS opstillingskredsnavn,
    vt.valglandsdelsbogstav,
    v.navn    AS valglandsdelsnavn,
    stort.storkredsnummer,
    stor.navn AS storkredsnavn,
    zt.zone,
    mr.mrafstemningsområdenummer as menighedsrådsafstemningsområdenummer,
    mr.navn as menighedsrådsafstemningsområdenavn
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
    LEFT JOIN afstemningsomraadetilknytninger aot ON a.id = aot.adgangsadresseid
    LEFT JOIN opstillingskredstilknytninger ot ON a.id = ot.adgangsadresseid
    LEFT JOIN opstillingskredse o ON ot.opstillingskredskode = o.kode
    LEFT JOIN valglandsdelstilknytninger vt ON a.id = vt.adgangsadresseid
    LEFT JOIN valglandsdele v ON vt.valglandsdelsbogstav = v.bogstav
    LEFT JOIN storkredstilknytninger stort ON a.id = stort.adgangsadresseid
    LEFT JOIN storkredse stor ON stort.storkredsnummer = stor.nummer
    LEFT JOIN zonetilknytninger zt ON a.id = zt.adgangsadresseid
LEFT JOIN dar1_darmenighedsrådsafstemningsområde_current mr ON hn.darmenighedsrådsafstemningsområde_id = mr.id
);
