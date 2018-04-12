DROP VIEW IF EXISTS ikke_brofaste_oer_view CASCADE;

CREATE VIEW ikke_brofaste_oer_view AS(
  select distinct id as stednavn_id
  FROM stednavne
  WHERE stednavne.undertype = 'ø'
  AND NOT EXISTS(select * from otilgang where gv_adgang_bro and st_contains(stednavne.geom, otilgang.geom)));