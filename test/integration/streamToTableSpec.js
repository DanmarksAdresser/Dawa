// "use strict";
//
// const expect = require('chai').expect;
// const path = require('path');
//
// const postgresMapper = require('../../dar10/postgresMapper');
// const streamToTable = require('../../dar10/streamToTable');
// const testdb = require('../helpers/testdb');
// const ait = require('./helpers').ait;
//
// describe('streamToTable', () => {
//   testdb.withTransactionEach('test', (clientFn, abortTransactionFn) => {
//     ait('Streams an ndjson file to table', function*() {
//       const entityName = 'Adresse';
//       const filePath = path.join(__dirname, 'streamToTable', `Adresse.ndjson`);
//       yield streamToTable(clientFn(), entityName, filePath, postgresMapper.tables[entityName], true);
//       const result = yield clientFn().queryp('select * from dar1_adresse order by rowkey');
//       expect(result.rows).to.have.length(2);
//       expect(result.rows[0].virkning.lower).to.equal('2015-09-28T06:05:16.950Z');
//     });
//     ait('Throws when input is invalid according to JSON schema', function*() {
//       const entityName = 'Adresse';
//       const filePath = path.join(__dirname, 'streamToTable', `AdresseInvalid.ndjson`);
//       try {
//         yield streamToTable(clientFn(), entityName, filePath, postgresMapper.tables[entityName], true);
//         expect.fail();
//       }
//       catch(e) {
//         abortTransactionFn(e);
//       }
//     });
//   });
// });
