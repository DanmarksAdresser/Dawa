DROP VIEW IF EXISTS dar_vejstykker_view;
CREATE VIEW dar_vejstykker_view AS select kommunekode, vejkode as kode,
                                     oprettimestamp at time zone 'Europe/Copenhagen' as oprettet,
  aendringstimestamp at time zone 'Europe/Copenhagen' as aendret, navn as vejnavn, adresseringsnavn
  FROM dar_vejnavn_current
   WHERE ophoerttimestamp is null
   -- vejkode >= 9900 er ikke rigtige veje
   AND  vejkode < 9900
   -- kommunekode >= 900 er grønlandske
   AND kommunekode < 900