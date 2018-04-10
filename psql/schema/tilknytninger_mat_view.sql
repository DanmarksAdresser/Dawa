DROP VIEW IF EXISTS tilknytninger_mat_view;
CREATE VIEW tilknytninger_mat_view AS (
    SELECT a.id AS adgangsadresseid,
      k.kode as kommunekode,
      k.navn as kommunenavn,
      reg.kode as regionskode,
      reg.navn as regionsnavn,
      st.sognekode,
      s.navn AS sognenavn,
      pt.politikredskode,
      p.navn AS politikredsnavn,
      rt.retskredskode,
      r.navn as retskredsnavn,
      ao.nummer as afstemningsområdenummer,
      ot.opstillingskredskode,
      o.navn as opstillingskredsnavn,
      vt.valglandsdelsbogstav,
      v.navn as valglandsdelsnavn,
      stort.storkredsnummer,
      stor.navn as storkredsnavn,
      zt.zone
    FROM adgangsadresser_mat a
  LEFT JOIN sognetilknytninger st ON a.id = st.adgangsadresseid
  LEFT JOIN sogne s ON st.sognekode = s.kode
  LEFT JOIN politikredstilknytninger pt ON a.id = pt.adgangsadresseid
  LEFT JOIN politikredse p ON pt.politikredskode = p.kode
  LEFT JOIN retskredstilknytninger rt ON a.id = rt.adgangsadresseid
  LEFT JOIN retskredse r ON rt.retskredskode = r.kode
  LEFT JOIN kommuner k ON a.kommunekode = k.kode
  LEFT JOIN regioner reg ON k.regionskode = reg.kode
  LEFT JOIN afstemningsomraadetilknytninger aot ON a.id = aot.adgangsadresseid
  LEFT JOIN afstemningsomraader ao
        ON ao.kommunekode = aot.kommunekode
           AND ao.nummer = aot.afstemningsområdenummer
  LEFT JOIN opstillingskredstilknytninger ot ON a.id = ot.adgangsadresseid
  LEFT JOIN opstillingskredse o ON ot.opstillingskredskode = o.kode
  LEFT JOIN valglandsdelstilknytninger vt ON a.id = vt.adgangsadresseid
  LEFT JOIN valglandsdele v ON vt.valglandsdelsbogstav = v.bogstav
  LEFT JOIN storkredstilknytninger stort ON a.id = stort.adgangsadresseid
  LEFT JOIN storkredse stor ON stort.storkredsnummer = stor.nummer
  LEFT JOIN zonetilknytninger zt ON a.id = zt.adgangsadresseid
);
