"use strict";

const path = require('path');
const q = require('q');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til produktionsdatabase', 'string'],
  subsetDir: [false, 'Directory hvor CSV-filer med subsets er placeret', 'string'],
  targetDir: [false, 'Directory hvor CSV-er placeres', 'string']
};

//const adgangsadresseIds = [
//  '0a3f5096-91d3-32b8-e044-0003ba298018' // Margrethepladsen 4, 8000 Aarhus C
//];
//
//const adresseIds = [
//  '91b21c97-fb07-4aac-98c5-61bcb4689f78', // Margrethepladsen 4, 8000 Aarhus C
//  '0a3f50ab-8c3d-32b8-e044-0003ba298018' // Sjællandsvej 17, 4600 Køge
//];

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), (args, options) => {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  const subsetSpec = {
    dar_vejnavn: ['kommunekode', 'vejkode'],
    dar_adresse: ['bkid']
  };

  proddb.withTransaction('READ_WRITE', (client) => {
    return q.async(function*() {
      const targetDir = path.resolve(options.targetDir);
      const copyOptions = `(format 'csv', header true, delimiter ';', quote '"', encoding 'utf8')`;
      for(let table of Object.keys(subsetSpec)) {
        const subsetFilePath = path.resolve(path.join(options.subsetDir, `${table}_subset.csv`));
        const subsetTable = `${table}_subset`;
        const targetFile = path.join(targetDir, `${table}.csv`);
        yield client.queryp(`CREATE TEMP TABLE ${subsetTable} AS (SELECT ${subsetSpec[table].join(', ')} FROM ${table} where false)`);
        yield client.queryp(`COPY ${subsetTable} FROM '${subsetFilePath}' ${copyOptions}`);
        yield client.queryp(`COPY (SELECT ${table}.* FROM ${table} NATURAL JOIN ${subsetTable} order by ${subsetSpec[table].join(', ')}, registrering) TO '${targetFile}' ${copyOptions}`);
      }

      const husnummerTargetFile = path.join(targetDir, `dar_husnummer.csv`);
      yield client.queryp(`COPY (SELECT distinct dar_husnummer.* FROM dar_husnummer
       JOIN dar_adresse ON husnummerid = dar_husnummer.id
        JOIN dar_adresse_subset ON dar_adresse.bkid = dar_adresse_subset.bkid order by dar_husnummer.id, dar_husnummer.virkning, dar_husnummer.registrering)
         TO '${husnummerTargetFile}' ${copyOptions}`);

      const adgangspunktTargetFile = path.join(targetDir, `dar_adgangspunkt.csv`);
      yield client.queryp(`COPY (SELECT distinct dar_adgangspunkt.* FROM dar_adgangspunkt
       JOIN dar_husnummer ON dar_husnummer.adgangspunktid = dar_adgangspunkt.id
       JOIN dar_adresse ON husnummerid = dar_husnummer.id
        JOIN dar_adresse_subset ON dar_adresse.bkid = dar_adresse_subset.bkid order by dar_adgangspunkt.id, dar_adgangspunkt.virkning, dar_adgangspunkt.registrering)
         TO '${adgangspunktTargetFile}' ${copyOptions}`);

      for(let table of ['dar_postnr', 'dar_supplerendebynavn']) {
        const targetFile = path.join(targetDir, `${table}.csv`);
        yield client.queryp(`COPY (SELECT distinct ${table}.* FROM ${table} NATURAL JOIN dar_vejnavn_subset order by kommunekode, vejkode, husnrinterval, side, registrering) TO '${targetFile}' ${copyOptions}`);
      }

      const cprVejTargetFile = path.join(targetDir, 'cpr_vej.csv');
      yield client.queryp(`COPY (SELECT cpr_vej.* FROM cpr_vej NATURAL JOIN dar_vejnavn_subset ORDER BY kommunekode, vejkode, registrering) TO '${cprVejTargetFile}' ${copyOptions}`);
    })();
  }).done();
});
