DROP VIEW IF EXISTS dar_vejstykker_view;
CREATE VIEW dar_vejstykker_view AS select kommunekode, vejkode as kode,
                                     oprettimestamp at time zone 'Europe/Copenhagen' as oprettet,
  aendringstimestamp at time zone 'Europe/Copenhagen' as aendret, navn as vejnavn, adresseringsnavn
  FROM dar_vejnavn WHERE ophoerttimestamp is null and upper_inf(registrering);
