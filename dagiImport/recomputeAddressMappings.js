"use strict";

const q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var logger = require('../logger').forCategory('dagiToDb');

const temaer = require('../apiSpecification/temaer/temaer');
var tema = require('../temaer/tema');
var proddb = require('../psql/proddb');


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  maxChanges: [false, 'Maximalt antal ændringer der udføres på adressetilknytninger (pr. tema)', 'number', 10000]
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec)), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', q.async(function*(client) {
    for(let temaDef of temaer) {
      yield tema.updateAdresserTemaerView(client, temaDef, false, options.maxChanges, false);
    }
    logger.info('Indlæsning af DAGI temaer gennemført', { temaer: temaer});
  }));
});
