DROP VIEW IF EXISTS vejnavne_mat_view;
CREATE VIEW vejnavne_mat_view AS (
    SELECT DISTINCT vejnavn as navn
    from navngivenvejkommunedel_mat);
