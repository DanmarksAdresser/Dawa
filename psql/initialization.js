"use strict";

/*eslint no-console: 0*/

const { go } = require('ts-csp');
var fs = require('fs');
var format = require('util').format;
var path = require('path');
var q = require('q');
var _ = require('underscore');

var datamodels = require('../crud/datamodel');
const generateSqlSchemaImpl = require('../dar10/generateSqlSchemaImpl');
const generateViews = require('../dar10/generateViews');
var sqlCommon = require('./common');
const flats = require('../apiSpecification/flats/flats');
const flatSqlSpecs = require('../apiSpecification/flats/sqlSpecs');
const flatTilknytninger = require('../apiSpecification/flats/tilknytninger/tilknytninger');
const generateOisSchemaImpl = require('../ois/generateSqlSchemaImpl');
const tableModel = require('./tableModel');
const { createChangeTable } = require('../importUtil/tableDiffNg');

var psqlScriptQ = sqlCommon.psqlScriptQ;

const createChangeTables = (client)=> go(function*() {
  const tableNames = ['ejerlav', 'postnumre', 'vejstykker', 'adgangsadresser', 'enhedsadresser', 'adgangsadresser_mat', 'stormodtagere', 'adresser_mat', 'vejpunkter', 'navngivenvej', 'navngivenvej_postnummer', 'vejstykkerpostnumremat', 'stednavne', 'stednavne_adgadr'];
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
  {name: 'transactions', init: false},
  {name: 'transaction_history'},
  {name: 'bbr_events'},
  {name: 'temaer'},
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
  {name: 'cpr_vej', init: false},
  {name: 'cpr_postnr', init: false},
  {name: 'dar1_transaction', init: false},
  {name: 'dar1_changelog', init: false},
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
  {name: 'temaer-views', init: false},
  {name: 'vejstykkerpostnr',           scriptFile: 'vejstykker-postnr-view.sql', type: 'view'},
  {name: 'postnumremini',              scriptFile: 'postnumre-mini-view.sql',    type: 'view'},
  {name: 'vejstykkerpostnumremat',     scriptFile: 'vejstykker-postnumre-view.sql', init: false},
  {name: 'navngivenvej_postnummer', init: false},
  {name: 'postnumre_kommunekoder_mat', scriptFile: 'postnumre-kommunekoder-mat.sql', init: false},
  {name: 'supplerendebynavne',         scriptFile: 'supplerendebynavne-view.sql'},
  {name: 'gridded_temaer_matview',     scriptFile: 'gridded-temaer-matview.sql'},
  {name: 'adgangsadresser_temaer_matview' },
  {name: 'adgangsadresserview',        scriptFile: 'adgangsadresser-view.sql',   type: 'view'},
  {name: 'adresser',                   scriptFile: 'adresse-view.sql',           type: 'view'},
  {name: 'vask_postnumre', init: false},
  {name: 'vask_postnrinterval', init: false},
  {name: 'vask_vejnavn', init: false},
  {name: 'vask_vejstykker_postnumre', init: false},
  {name: 'vask_adgangsadresser', init: false},
  {name: 'vask_adgangsadresser_unikke', init: false},
  {name: 'vask_adresser', init: false},
  {name: 'vask_adresser_unikke', init: false},
  {name: 'gt_pk_metadata', init: false},
  {name: 'wms_housenumber_inspire', type: 'view'},
  {name: 'wms_adgangsadresser', type: 'view'},
  {name: 'wms_vejpunkter', type: 'view'},
  {name: 'wms_vejpunktlinjer', init: false},
  {name: 'wfs_adgangsadresser', type: 'view'},
  {name: 'wfs_adresser', type: 'view'},
  {name: 'jordstykker', init: false },
  {name: 'bebyggelser', init: false},
  {name: 'bebyggelser_adgadr', init: false},
  {name: 'bebyggelser_divided', init: false},
  {name: 'stednavne', init: false},
  {name: 'stednavntyper', init: false},
  {name: 'stednavne_adgadr', init: false},
  {name: 'stednavne_divided', init: false},
  {name: 'stednavn_kommune', init: false},
  {name: 'ois_importlog', init: false}
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
    for (let spec of exports.tableSpecs) {
      if(spec.type !== 'view') {
        yield psqlScriptQ(client, path.join(scriptDir, 'tables'), spec.scriptFile);
      }
    }
    yield client.queryp(generateSqlSchemaImpl());
    yield client.queryp(generateOisSchemaImpl());
    yield createChangeTables(client);
  })();
};


function createFlatTilknytningTriggers(client) {
  const deleteSql = flatName => {
    const sqlSpec = flatSqlSpecs[flatName];
    const relTable = `${sqlSpec.table}_adgadr`;
    return `DELETE FROM ${relTable} WHERE adgangsadresse_id = OLD.id;`
  };

  const insertSql = flatName => {
    const flat = flats[flatName];
    const sqlSpec = flatSqlSpecs[flatName];
    const relTable = `${sqlSpec.table}_adgadr`;
    const tilknytning = flatTilknytninger[flatName];
    const flatGeometryTable = sqlSpec.subdividedGeometryIndex ? `${sqlSpec.table}_divided` : sqlSpec.table ;
    const flatRelationFlatKey = _.values(tilknytning.keyFieldColumns).join(', ');
    const flatRelationCompleteKey = flatRelationFlatKey + ', adgangsadresse_id';
    const flatKeySql = flat.key.map(key => `F.${key}`).join(', ');
    return `INSERT INTO ${relTable}(${flatRelationCompleteKey}) 
    (SELECT 
    ${flatKeySql}, A.id
    FROM Adgangsadresser_mat A, ${flatGeometryTable} F
    WHERE A.id = NEW.id AND st_covers(F.geom, A.geom)) ON CONFLICT DO NOTHING;`
  };

  const updateSql = flatName => {
    const flat = flats[flatName];
    const sqlSpec = flatSqlSpecs[flatName];
    const relTable = `${sqlSpec.table}_adgadr`;
    const tilknytning = flatTilknytninger[flatName];
    const flatRelColumns = _.values(tilknytning.keyFieldColumns);
    const relTableColumns = ['adgangsadresse_id'].concat(flatRelColumns);
    const relJoinCond = flat.key.map(keyField => `F.${keyField} = R.${tilknytning.keyFieldColumns[keyField]}`).join(' AND ');
    const flatGeometryTable = sqlSpec.subdividedGeometryIndex ? `${sqlSpec.table}_divided` : sqlSpec.table;
    const deleteSql = `
    DELETE FROM ${relTable} AS R WHERE adgangsadresse_id = NEW.id AND NOT EXISTS(
    SELECT *
    FROM Adgangsadresser_mat A, ${flatGeometryTable} F
  WHERE R.adgangsadresse_id = A.id  AND ${relJoinCond} AND st_covers(F.geom, A.geom)
);`;

    const insertSql = `
    INSERT INTO ${relTable} AS R(${relTableColumns.join(',')}) 
    (SELECT A.id, ${flat.key.map(key => `F.${key}`).join(',')}
     FROM Adgangsadresser_mat A JOIN ${flatGeometryTable} F ON st_covers(F.geom, A.geom) 
     WHERE A.id = NEW.id) ON CONFLICT DO NOTHING;`;
    return `${deleteSql}\n${insertSql}`;
  }
  const triggerSql =
    `DROP FUNCTION IF EXISTS adgangsadresser_flats_update_on_adgangsadresse() CASCADE;
  CREATE FUNCTION adgangsadresser_flats_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
  BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.geom IS NOT DISTINCT FROM NEW.geom) THEN
  RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN
  ${Object.keys(flats).map(flatName => deleteSql(flatName)).join('\n')}
  ELSIF TG_OP = 'INSERT' THEN
  ${Object.keys(flats).map(flatName => insertSql(flatName)).join('\n')}
  ELSE
  ${Object.keys(flats).map(flatName => updateSql(flatName)).join('\n')}
  END IF;
  RETURN NULL;
  END;
  $$ LANGUAGE plpgsql;
  CREATE TRIGGER adgangsadresser_flats_update_on_adgangsadresse_trigger AFTER INSERT OR UPDATE OR DELETE
  ON adgangsadresser_mat FOR EACH ROW EXECUTE PROCEDURE adgangsadresser_flats_update_on_adgangsadresse()`;
  return client.queryp(triggerSql);
}

/*
 * For each table that has a history table, generate a trigger to maintain it.
 * This is horrible, but generic code in plpgsql is even worse. Perhaps
 * plv8 would be an option?
 */
function createHistoryTriggers(client) {

  var sql = _.reduce(['adgangsadresse_tema', 'jordstykketilknytning'], function(sql, datamodelName) {
    var datamodel = datamodels[datamodelName];
    var table = datamodel.table;
    sql += format('DROP FUNCTION IF EXISTS %s_history_update() CASCADE;\n', table);
    sql += format('CREATE OR REPLACE FUNCTION %s_history_update()\n', table);
    sql += 'RETURNS TRIGGER AS $$\n';
    sql += 'DECLARE\n';
    sql += 'seqnum integer;\n';
    sql += 'optype operation_type;\n';
    sql += "BEGIN\n";

    // we need to verify that one of the history fieldMap have changed, not just the tsv- or geom columns
    var isNotDistinctCond = datamodel.columns.map(function(column) {
      return format("OLD.%s IS NOT DISTINCT FROM NEW.%s", column, column);
    }).join(" AND ");

    sql += format("IF TG_OP = 'UPDATE' AND (%s) THEN\n", isNotDistinctCond);
    sql += "RETURN NULL;\n";
    sql += "END IF;\n";


    sql += "seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);\n";
    sql += "optype = lower(TG_OP);\n";

    // set valid_to on existing history row
    sql += "IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN\n";

    var keyClause = _.map(datamodel.key, function(keyColumn) {
      return keyColumn + ' = OLD.' + keyColumn;
    }).join(' AND ');

    sql += format("UPDATE %s_history SET valid_to = seqnum WHERE %s AND valid_to IS NULL;\n", table, keyClause);
    sql += "END IF;\n";

    // create the new history row
    sql += "IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN\n";
    sql += format("INSERT INTO %s_history(\n", table);
    sql += 'valid_from, ';
    sql += datamodel.columns.join(', ') + ')\n';
    sql += " VALUES (\n";
    sql += 'seqnum, ' + datamodel.columns.map(function(column) {
      return 'NEW.' + column;
    }).join(', ') + ");\n";
    sql += "END IF;\n";

    // add entry to transaction_history
    sql += format("INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, '%s', optype);", datamodel.name);
    sql += "RETURN NULL;\n";
    sql += "END;\n";
    sql += "$$ LANGUAGE PLPGSQL;\n";

    // create the trigger
    sql += format("CREATE TRIGGER %s_history_update AFTER INSERT OR UPDATE OR DELETE\n", table);
    sql += format("ON %s FOR EACH ROW EXECUTE PROCEDURE\n", table);
    sql += format("%s_history_update();\n", table);

    return sql;
  }, '');
  console.log(sql);
  return client.queryp(sql);
}

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
    yield createHistoryTriggers(client);
    yield createFlatTilknytningTriggers(client);
  })();
};

exports.loadSchemas = function(client, scriptDir){
  return q.async(function*() {
    yield exports.loadTables(client, scriptDir);
    yield exports.reloadDatabaseCode(client, scriptDir);
  })();
};

function initializeHistoryTable(client, entityName) {
  var datamodel = datamodels[entityName];
  var query = 'INSERT INTO ' + datamodel.table + '_history (' + datamodel.columns.join(', ') + ') (select ' + datamodel.columns.join(', ') + ' from ' + datamodel.table + ')';
  return client.queryp(query, []);
}

exports.initializeHistoryTable = initializeHistoryTable;
