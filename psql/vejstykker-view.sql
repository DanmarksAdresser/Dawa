DROP VIEW IF EXISTS vejstykkerView;
CREATE VIEW vejstykkerView AS
  SELECT
    vejstykker.kode,
    vejstykker.kommunekode,
    vejstykker.version,
    vejnavn,
    vejstykker.tsv,
    max(kommuner.navn) AS kommunenavn,
    json_agg(PostnumreMini) AS postnumre
  FROM vejstykker
    LEFT JOIN Dagitemaer kommuner ON kommuner.tema = 'kommune' AND vejstykker.kommunekode = kommuner.kode
    LEFT JOIN vejstykkerPostnr
      ON (vejstykkerPostnr.kommunekode = vejstykker.kommunekode AND vejstykkerPostnr.vejkode = vejstykker.kode)
    LEFT JOIN PostnumreMini ON (PostnumreMini.nr = postnr)
  GROUP BY vejstykker.kode, vejstykker.kommunekode;

