DROP TABLE IF EXISTS navngivenvejkommunedel_postnr_mat CASCADE;
CREATE TABLE navngivenvejkommunedel_postnr_mat(
  navngivenvejkommunedel_id UUID NOT NULL,
  postnummer_id UUID NOT NULL,
  PRIMARY KEY(navngivenvejkommunedel_id, postnummer_id)
);