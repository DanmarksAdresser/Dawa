const { go } = require('ts-csp');

module.exports = {
  id: 'Zip-Municipality-Relation',
  description: 'Relation mellem postnumre og kommunekoder',
  requires: ['adgangsadresser'],
  // only tables with change tables should be present in produces
  produces: [],
  execute:  (client, txid) => go(function*() {
    yield client.query(`DELETE FROM postnumre_kommunekoder_mat;
   insert into postnumre_kommunekoder_mat(postnr, kommunekode) (SELECT DISTINCT postnr, kommunekode FROM adgangsadresser where postnr is not null and kommunekode is not null)`);
  })
};