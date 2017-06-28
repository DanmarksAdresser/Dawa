"use strict";

var q = require('q');
var _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');
const importJordstykkerImpl = require('./importJordstykkerImpl');
const logger = require('../logger').forCategory('matrikelImport');

var optionSpec = {
  sourceDir: [false, 'Directory hvor matrikel-filerne ligger', 'string', '.'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false],
  refresh: [false, 'Genindlæs alle jordstykker', 'boolean', false]
};

q.longStackSupport = true;

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'lastUpdated'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  q.async(function*() {
    yield importJordstykkerImpl.doImport(proddb, options.sourceDir, options.init, options.refresh);
    yield proddb.withTransaction('READ_ONLY', q.async(function*(client) {
      const overlapping = yield client.queryRows(`with adrs AS (SELECT a.id, a.geom FROM adgangsadresser_mat a 
    JOIN jordstykker j ON ST_Covers(j.geom, a.geom)
     GROUP BY a.id, a.geom HAVING count(*) > 1)
SELECT a.id as adgangsadresse_id, ejerlavkode, matrikelnr FROM adrs a JOIN jordstykker j 
ON ST_Covers(j.geom, a.geom)`);
      if (overlapping.length > 0) {
        logger.info('Overlappende jordstykker', {rows: overlapping});
      }
    }));
  })().done();
});
