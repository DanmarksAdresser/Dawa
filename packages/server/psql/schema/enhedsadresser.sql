DROP VIEW IF EXISTS dar1_enhedsadresser_view CASCADE;
DROP VIEW IF EXISTS enhedsadresser_view;
CREATE VIEW enhedsadresser_view AS
  SELECT
    id,
    adgangsadresseid,
    dar1_status_til_dawa_status(status) AS objekttype,
    oprettet,
    aendret,
    ikraftfra,
    etage,
    doer
  FROM adresser_mat
  WHERE status IN (2, 3);