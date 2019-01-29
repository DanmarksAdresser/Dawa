"use strict";

/*eslint no-console: 0*/

const { go } = require('ts-csp');
var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');

const dar10SqlSchema = require('../dar10/generateSqlSchemaImpl');
const generateViews = require('../dar10/generateViews');
var sqlCommon = require('./common');
const generateOisSchemaImpl = require('../ois/generateSqlSchemaImpl');
const tableModel = require('./tableModel');
const { createChangeTable } = require('@dawadk/import-util/src/table-diff');
const { generateAllTemaTables, generateTilknytningMatViews } = require('../dagiImport/sqlGen');
const { generateTilknytningMatView } = require('../importUtil/tilknytningUtil');
const stednavnTilknytningModels = require('../stednavne/stednavnTilknytningModels');
const jordstykkeTilknytningModel = require('../matrikeldata/jordstykkeTilknytningModel');
const bygningTilknytningModel = require('../bygninger/bygningTilknytningModel');

var psqlScriptQ = sqlCommon.psqlScriptQ;

const createChangeTables = (client)=> go(function*() {
  const tableNames = [
    'ejerlav', 'postnumre', 'vejstykker', 'adgangsadresser', 'enhedsadresser',
    'adgangsadresser_mat', 'stormodtagere', 'adresser_mat', 'vejpunkter', 'navngivenvej',
    'navngivenvej_postnummer', 'vejstykkerpostnumremat', 'stednavne', 'steder', 'stedtilknytninger',
  'navngivenvejkommunedel_postnr_mat', 'brofasthed', 'ikke_brofaste_adresser', 'bygninger', 'bygningtilknytninger', 'bygning_kommune',
  'supplerendebynavn2_postnr', 'jordstykker', 'jordstykker_adgadr', 'hoejder', 'hoejde_importer_resultater', 'hoejde_importer_afventer'];
  for(let table of tableNames) {
    yield createChangeTable(client, tableModel.tables[table]);
  }
});

function normaliseTableSpec(specs){
  return _.map(
    specs,
    function(spec){
      if (!spec.scriptFile){
        spec.scriptFile = spec.name+".sql";
      }
      if (!spec.type){
        spec.type = 'table';
      }
      return spec;
    });
}

// Note, the sequence of the tables matter!
exports.tableSpecs = normaliseTableSpec([
  {name: 'hoejder', init: false},
  {name: 'brofasthed', init: false},
  {name: 'ikke_brofaste_adresser', init: false},
  {name: 'tx_log', init: false},
  {name: 'transactions', init: false},
  {name: 'tx_operation_counts', init: false},
  {name: 'transaction_history', init: false},
  {name: 'bbr_events'},
  {name: 'vejstykker', init: false},
  {name: 'postnumre'},
  {name: 'stormodtagere'},
  {name: 'adgangsadresser', init: false },
  {name: 'enhedsadresser', init: false },
  {name: 'navngivenvej', init: false},
  {name: 'vejpunkter', init: false},
  {name: 'ejerlav', init: false},
  {name: 'ejerlav_ts'},
  {name: 'adgangsadresser_mat', init: false },
  {name: 'adresser_mat', init: false },
  {name: 'navngivenvejkommunedel_postnr_mat', init: false},
  {name: 'navngivenvejkommunedel_postnr_mat_view', type: 'view'},
  {name: 'cpr_vej', init: false},
  {name: 'cpr_postnr', init: false},
  {name: 'dar1_transaction', init: false},
  {name: 'dar1_changelog', init: false},
  {name: 'dar1_postnumre_view', type: 'view'},
  {name: 'dar1_vejstykker_view', type: 'view'},
  {name: 'dar1_adgangsadresser_view', type: 'view'},
  {name: 'dar1_enhedsadresser_view', type: 'view'},
  {name: 'dar1_navngivenvej_view', type: 'view'},
  {name: 'dar1_navngivenvej_postnummer_view', type: 'view'},
  {name: 'dar1_vejstykkerpostnumremat_view', type: 'view'},
  {name: 'dar1_vejpunkter_view', type: 'view'},
  {name: 'dar_transaction', init: false},
  {name: 'dar_lastfetched', init: false },
  {name: 'dar_adgangspunkt', init: false},
  {name: 'dar_adgangspunkt_current', type: 'view'},
  {name: 'dar_adresse', init: false},
  {name: 'dar_adresse_current', type: 'view'},
  {name: 'dar_husnummer', init: false},
  {name: 'dar_husnummer_current', type: 'view'},
  {name: 'dar_vejnavn', init: false},
  {name: 'dar_vejnavn_current', type: 'view'},
  {name: 'dar_postnr', init: false},
  {name: 'dar_postnr_current', type: 'view'},
  {name: 'dar_supplerendebynavn', init: false},
  {name: 'dar_supplerendebynavn_current', type: 'view'},
  {name: 'dar_vejstykker_view', type: 'view'},
  {name: 'dar_adgangsadresser_view', type: 'view'},
  {name: 'dar_enhedsadresser_view', type: 'view'},
  {name: 'hoejder', init: false},
  {name: 'vejstykkerpostnr',           scriptFile: 'vejstykker-postnr-view.sql', type: 'view'},
  {name: 'postnumremini',              scriptFile: 'postnumre-mini-view.sql',    type: 'view'},
  {name: 'vejstykkerpostnumremat',     scriptFile: 'vejstykker-postnumre-view.sql', init: false},
  {name: 'navngivenvej_postnummer', init: false},
  {name: 'postnumre_kommunekoder_mat', scriptFile: 'postnumre-kommunekoder-mat.sql', init: false},
  {name: 'supplerendebynavne',         scriptFile: 'supplerendebynavne-view.sql', init: false},
  {name: 'gridded_temaer_matview',     scriptFile: 'gridded-temaer-matview.sql', init:false},
  {name: 'tilknytninger_mat', init: false},
  {name: 'adgangsadresser_temaer_matview', init: false },
  {name: 'vask_postnumre', init: false},
  {name: 'vask_postnrinterval', init: false},
  {name: 'vask_vejnavn', init: false},
  {name: 'vask_vejstykker_postnumre', init: false},
  {name: 'vask_adgangsadresser', init: false},
  {name: 'vask_adgangsadresser_unikke', init: false},
  {name: 'vask_adresser', init: false},
  {name: 'vask_adresser_unikke', init: false},
  {name: 'jordstykker', init: false },
  {name: 'bebyggelser', init: false},
  {name: 'bebyggelser_adgadr', init: false},
  {name: 'bebyggelser_divided', init: false},
  {name: 'stednavne', init: false},
  {name: 'stednavntyper', init: false},
  {name: 'stedtilknytninger', init: false},
  {name: 'steder_divided', init: false},
  {name: 'sted_kommune', init: false},
  {name: 'bygninger', init: false},
  {name: 'bygningtilknytninger', init: false},
  {name: 'bygning_kommune', init: false},
  {name: 'bygning_kommune_view', type: 'view'},
  {name: 'ikke_brofaste_adresser_view', type: 'view'},
  {name: 'tilknytninger_mat_view', type: 'view'},
  {name: 'ois_importlog', init: false},
  {name: 'bebyggelser_view', type: 'view'},
  {name: 'adgangsadresserview',        scriptFile: 'adgangsadresser-view.sql',   type: 'view'},
  {name: 'adresser',                   scriptFile: 'adresse-view.sql',           type: 'view'},
  {name: 'supplerendebynavn2_postnr', init: false},
  {name: 'supplerendebynavn2_postnr_view', type: 'view'},
  {name: 'gt_pk_metadata', init: false},
  {name: 'wms_housenumber_inspire', type: 'view'},
  {name: 'wms_adgangsadresser', type: 'view'},
  {name: 'wms_vejpunkter', type: 'view'},
  {name: 'wms_vejpunktlinjer', init: false},
  {name: 'wfs_adgangsadresser', type: 'view'},
  {name: 'wfs_adresser', type: 'view'},
  {name: 'wms_navngivneveje', type: 'view'}
]);

exports.forAllTableSpecs = function(client, func){
  return q.async(function*() {
    for(let spec of exports.tableSpecs) {
      yield func(client, spec);
    }
  })();
};

exports.disableTriggersAndInitializeTables = function(client) {
  return q.async(function*() {
    yield sqlCommon.disableTriggersQ(client);
    yield exports.initializeTables(client);
    yield sqlCommon.enableTriggersQ(client);
  })();
};

exports.initializeTables = function(client){
  return q.async(function*() {
    for (let spec of exports.tableSpecs) {
      if (spec.type !== 'view' && spec.init !== false) {
        yield sqlCommon.execSQL("select " + spec.name + "_init()", client, true);
      }
    }
  })();
};

exports.loadTables = function(client, scriptDir) {
  return q.async(function*() {
    console.log('creating tables');
    yield psqlScriptQ(client, path.join(scriptDir, 'tables'), 'misc.sql');
    yield client.query(generateAllTemaTables());
    for (let spec of exports.tableSpecs) {
      if(spec.type !== 'view') {
        yield psqlScriptQ(client, path.join(scriptDir, 'tables'), spec.scriptFile);
      }
    }
    yield client.query(dar10SqlSchema);
    yield client.queryp(generateOisSchemaImpl());
    yield createChangeTables(client);
  })();
};

exports.reloadDatabaseCode = function(client, scriptDir) {
  return q.async(function*() {
    console.log('loading database functions from ' + scriptDir);
    yield psqlScriptQ(client, scriptDir, 'misc.sql');
    yield client.queryp(generateViews());
    for(let spec of exports.tableSpecs) {
      var scriptPath = path.join(scriptDir, spec.scriptFile);
      if( fs.existsSync(scriptPath)) {
        console.log("loading script " + spec.scriptFile);
        yield psqlScriptQ(client, scriptDir, spec.scriptFile);
      }
      else {
        console.log('no script file for ' + spec.name);
      }
    }
    yield client.query(generateTilknytningMatViews());
    for(let model of stednavnTilknytningModels) {
      yield client.query(generateTilknytningMatView(model));
    }
    yield client.query(generateTilknytningMatView(jordstykkeTilknytningModel));
    yield client.query(generateTilknytningMatView(bygningTilknytningModel));
  })();
};

exports.loadSchemas = function(client, scriptDir){
  return q.async(function*() {
    yield exports.loadTables(client, scriptDir);
    yield exports.reloadDatabaseCode(client, scriptDir);
  })();
};