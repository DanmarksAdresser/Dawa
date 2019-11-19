"use strict";

/*eslint no-console: 0*/

const { assert } = require('chai');
const { go } = require('ts-csp');
var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');

const dar10SqlSchema = require('../dar10/generateSqlSchemaImpl');
const generateViews = require('../dar10/generateViews');
var sqlCommon = require('./common');
const generateOisSchemaImpl = require('../ois/generateSqlSchemaImpl');
const { tableSql } = require('../ois2/sql-gen');
const grbbrTableModels = require('../ois2/table-models');
const grbbrViewSql = require('../ois2/materializations').viewSql;
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
  'supplerendebynavn2_postnr', 'matrikel_jordstykker', 'jordstykker', 'jordstykker_adgadr', 'hoejder', 'hoejde_importer_resultater',
    'hoejde_importer_afventer', 'navngivenvej_mat', 'navngivenvejkommunedel_mat', 'vejmidter', 'supplerendebynavne_mat',
  'supplerendebynavn_postnr_mat', 'supplerendebynavn_kommune_mat', 'postnumre_kommunekoder_mat', 'vask_adgangsadresser', 'vask_adresser', 'vejnavne_mat',
      'navngivenvejpostnummerrelation',
    'vejnavnpostnummerrelation',
    ...grbbrTableModels.allTableModels.map(model => model.table)];
  for(let table of tableNames) {
    const model = tableModel.tables[table];
    assert(model, "no table model for " + model.table);
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
  {name: 'blobref'},
  {name: 'hoejder'},
  {name: 'brofasthed'},
  {name: 'ikke_brofaste_adresser'},
  {name: 'tx_log'},
  {name: 'transactions'},
  {name: 'tx_operation_counts'},
  {name: 'transaction_history'},
  {name: 'bbr_events'},
  {name: 'vejstykker'},
  {name: 'postnumre'},
  {name: 'stormodtagere'},
  {name: 'adgangsadresser' },
  {name: 'enhedsadresser' },
  {name: 'navngivenvej'},
  {name: 'vejpunkter'},
  {name: 'ejerlav'},
  {name: 'ejerlav_ts'},
  {name: 'vejmidter'},
  {name: 'navngivenvej_mat'},
  {name: 'navngivenvejkommunedel_mat'},
  {name: 'vejnavne_mat'},
  {name: 'adgangsadresser_mat' },
  {name: 'adresser_mat' },
  {name: 'navngivenvejkommunedel_postnr_mat'},
  {name: 'navngivenvejkommunedel_postnr_mat_view', type: 'view'},
  {name: 'cpr_vej'},
  {name: 'cpr_postnr'},
  {name: 'dar1_transaction'},
  {name: 'dar1_changelog'},
  {name: 'dar1_navngivenvej_postnummer_view', type: 'view'},
  {name: 'dar1_vejpunkter_view', type: 'view'},
  {name: 'dar_transaction'},
  {name: 'dar_lastfetched' },
  {name: 'dar_adgangspunkt'},
  {name: 'dar_adgangspunkt_current', type: 'view'},
  {name: 'dar_adresse'},
  {name: 'dar_adresse_current', type: 'view'},
  {name: 'dar_husnummer'},
  {name: 'dar_husnummer_current', type: 'view'},
  {name: 'dar_vejnavn'},
  {name: 'dar_vejnavn_current', type: 'view'},
  {name: 'dar_postnr'},
  {name: 'dar_postnr_current', type: 'view'},
  {name: 'dar_supplerendebynavn'},
  {name: 'dar_supplerendebynavn_current', type: 'view'},
  {name: 'dar_vejstykker_view', type: 'view'},
  {name: 'dar_adgangsadresser_view', type: 'view'},
  {name: 'dar_enhedsadresser_view', type: 'view'},
  {name: 'hoejder'},
  {name: 'postnumremini',              scriptFile: 'postnumre-mini-view.sql',    type: 'view'},
  {name: 'vejstykkerpostnumremat'},
  {name: 'navngivenvej_postnummer'},
  {name: 'navngivenvejpostnummerrelation'},
  {name: 'vejnavnpostnummerrelation'},
  {name: 'postnumre_kommunekoder_mat', scriptFile: 'postnumre-kommunekoder-mat.sql'},
  {name: 'gridded_temaer_matview',     scriptFile: 'gridded-temaer-matview.sql'},
  {name: 'tilknytninger_mat'},
  {name: 'adgangsadresser_temaer_matview' },
  {name: 'vask_postnumre'},
  {name: 'vask_postnrinterval'},
  {name: 'vask_vejnavn'},
  {name: 'vask_vejstykker_postnumre'},
  {name: 'vask_adgangsadresser'},
  {name: 'vask_adgangsadresser_unikke'},
  {name: 'vask_adresser'},
  {name: 'vask_adresser_unikke'},
  {name: 'matrikel_jordstykker' },
  {name: 'jordstykker' },
  {name: 'bebyggelser'},
  {name: 'bebyggelser_adgadr'},
  {name: 'bebyggelser_divided'},
  {name: 'stednavne'},
  {name: 'stednavntyper'},
  {name: 'stedtilknytninger'},
  {name: 'steder_divided'},
  {name: 'sted_kommune'},
  {name: 'bygninger'},
  {name: 'bygningtilknytninger'},
  {name: 'bygning_kommune'},
  {name: 'bygning_kommune_view', type: 'view'},
  {name: 'ikke_brofaste_adresser_view', type: 'view'},
  {name: 'tilknytninger_mat_view', type: 'view'},
  {name: 'ois_importlog'},
  {name: 'bebyggelser_view', type: 'view'},
  {name: 'adgangsadresserview',        scriptFile: 'adgangsadresser-view.sql',   type: 'view'},
  {name: 'adresser',                   scriptFile: 'adresse-view.sql',           type: 'view'},
  {name: 'supplerendebynavne_mat'},
  {name: 'supplerendebynavn_kommune_mat'},
  {name: 'supplerendebynavn_postnr_mat'},
  {name: 'supplerendebynavn2_postnr'},
  {name: 'gt_pk_metadata'},
  {name: 'wms_housenumber_inspire', type: 'view'},
  {name: 'wms_adgangsadresser', type: 'view'},
  {name: 'wms_vejpunkter', type: 'view'},
  {name: 'wms_vejpunktlinjer'},
  {name: 'wfs_adgangsadresser', type: 'view'},
  {name: 'wfs_adresser', type: 'view'},
  {name: 'wms_navngivneveje', type: 'view'},
  {name: 'grbbr_virkning_ts'}
]);

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
    yield client.query(tableSql);
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
    yield client.query(grbbrViewSql);
  })();
};

const scriptDir = path.join(__dirname, 'schema');


exports.initializeSchema = (client) => go(function*() {
  yield exports.loadTables(client, scriptDir);
  yield exports.reloadDatabaseCode(client, scriptDir);
});