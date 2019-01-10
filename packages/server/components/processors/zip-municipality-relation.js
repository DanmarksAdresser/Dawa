const { go } = require('ts-csp');

module.exports = {
  description: 'Relation mellem postnumre og kommunekoder',
  execute:  (client, txid) => go(function*() {
    yield client.query(`DELETE FROM postnumre_kommunekoder_mat;
   insert into postnumre_kommunekoder_mat(postnr, kommunekode) (SELECT DISTINCT postnr, kommunekode FROM adgangsadresser where postnr is not null and kommunekode is not null)`);
  })
};