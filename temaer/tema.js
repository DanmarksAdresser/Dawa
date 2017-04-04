"use strict";


var async = require('async');
var q = require('q');
var xml2js = require('xml2js');
var _ = require('underscore');

var datamodels = require('../crud/datamodel');
var gml = require('../temaer/gml');
var jsonFieldMap = require('../apiSpecification/temaer/additionalFields');
var logger = require('../logger').forCategory('tema');
var sqlCommon = require('../psql/common');
const tablediff = require('../importUtil/tablediff');
var temaerApi = require('../apiSpecification/temaer/temaer');


function makeUnionSql(count, firstAlias) {
  var items = [], i;
  for (i = 0; i < count; i += 1) {
    items.push('ST_GeomFromText($' + (firstAlias + i) + ')');
  }
  return 'ST_union(ARRAY[' + items.join(',') + '])';
}

function getKeyValue(tema, temaSpec) {
  return temaSpec.key.map(function (keySpec) {
    return tema.fields[keySpec.name];
  });
}

function hasSameKey(a, b, keySpecs) {
  return keySpecs.reduce(function (memo, keySpec) {
    return memo && (a.fields[keySpec.name] === b.fields[keySpec.name]);
  }, true);
}

function removeAll(aas, bs, keySpecs) {
  return _.filter(aas, function (a) {
    return _.every(bs, function (newTema) {
      return !hasSameKey(a, newTema, keySpecs);
    });
  });
}

function getTemaer(client, temaNavn, constraints, callback) {
  var sql = "SELECT tema, id, aendret, geo_version, geo_aendret, fields FROM temaer WHERE tema = $1 AND slettet IS NULL";
  var params = [temaNavn];
  if (constraints) {
    _.forEach(constraints, function (value, key) {
      sql += " AND temaer.fields->>'" + key + "' = $" + (params.length + 1) + "::text";
      params.push(value);
    });
  }
  return client.queryp(sql, params).then(function (result) {
    if (result.rows) {
      return result.rows;
    }
    else {
      return [];
    }
  }).nodeify(callback);
}

function rowExists(client, temaDef, tema) {
  var sql = 'SELECT EXISTS(SELECT * FROM TEMAER WHERE tema = $1';
  temaDef.key.forEach(function (keySpec, index) {
    sql += " AND fields->>'" + keySpec.name + "' = $" + (index + 2) + "::text";
  });
  sql += ') as exist';
  var params = [tema.tema].concat(getKeyValue(tema, temaDef));
  return client.queryp(sql, params).then(function (result) {
    return result.rows[0].exist;
  });
}

function undelete(client, temaDef, tema) {
  var sql = 'UPDATE temaer SET slettet = NULL WHERE tema = $1';
  temaDef.key.forEach(function (keySpec, index) {
    sql += " AND fields->>'" + keySpec.name + "' = $" + (index + 2) + "::text";
  });
  var params = [tema.tema].concat(getKeyValue(tema, temaDef));
  return client.queryp(sql, params);
}

exports.addTema = function (client, tema, callback) {
  var temaDef = exports.findTema(tema.tema);
  return rowExists(client, temaDef, tema).then(function (exists) {
    if (exists) {
      return undelete(client, temaDef, tema).then(function () {
        return exports.updateTema(client, temaDef, tema);
      });
    }
    else {
      var sql = 'INSERT INTO temaer(tema, aendret, geo_version, geo_aendret, fields, geom) ' +
        'VALUES ($1, NOW(), $2, NOW(), $3, ST_Multi(ST_SetSRID(' + makeUnionSql(tema.polygons.length, 4) + ', 25832))) RETURNING id';
      var params = [tema.tema, 1, tema.fields].concat(tema.polygons);
      return client.queryp(sql, params).then(function (result) {
        return result.rows[0].id;
      });
    }
  }).nodeify(callback);
};

exports.deleteTema = function (client, temaDef, tema, callback) {
  var sql = "UPDATE temaer SET slettet = NOW(), geom=NULL WHERE tema = $1";
  temaDef.key.forEach(function (keySpec, index) {
    sql += " AND fields->>'" + keySpec.name + "' = $" + (index + 2) + "::text";
  });
  var params = [tema.tema].concat(getKeyValue(tema, temaDef));
  return client.queryp(sql, params).nodeify(callback);
};

exports.putTemaer = function (temaDef, temaer, client, initializing, constraints, updateTilknytninger, maxChanges, callback) {
  return getTemaer(client, temaDef.singular, constraints).then(function (existingTemaer) {
    var temaerToRemove = removeAll(existingTemaer, temaer, temaDef.key);
    var temaerToCreate = removeAll(temaer, existingTemaer, temaDef.key);
    var temaerToUpdate = removeAll(temaer, temaerToCreate, temaDef.key);
    return q.nfcall(function (callback) {
      async.series([
        function (callback) {
          async.eachSeries(temaerToRemove, function (tema, callback) {
            logger.info('Removing DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.deleteTema(client, temaDef, tema, callback);
          }, callback);
        },
        function (callback) {
          async.eachSeries(temaerToCreate, function (tema, callback) {
            logger.info('Adding DAGI tema', {tema: tema.tema, fields: tema.fields});
            exports.addTema(client, tema, callback);
          }, callback);
        },
        function (callback) {
          async.eachSeries(temaerToUpdate, function (tema, callback) {
            exports.updateTema(client, temaDef, tema, function (err, result) {
              if (err) {
                return callback(err);
              }
              if (result.rowCount === 0) {
                logger.debug('DAGI tema uændret');
              }
              else {
                logger.info('Opdaterede DAGI tema', {
                  tema: tema.tema,
                  kode: tema.kode,
                  navn: tema.navn
                });
              }
              callback(err, result);
            });
          }, callback);
        },
        function (callback) {
          if (!updateTilknytninger) {
            return callback();
          }
          exports.updateAdresserTemaerView(client, temaDef, initializing, maxChanges, false, callback);
        },
        function (callback) {
          if (temaDef.materialized) {
            return client.queryp('REFRESH MATERIALIZED VIEW CONCURRENTLY ' + temaDef.plural).nodeify(callback);
          }
          else {
            return callback();
          }
        }
      ], callback);
    });
  }).nodeify(callback);
};

exports.updateTema = function (client, temaDef, tema, callback) {
  var fieldsNotChangedClause = jsonFieldMap[temaDef.singular].map(function (field) {
    return "(fields->>'" + field.name + "') IS DISTINCT FROM ($" + (temaDef.key.length + 1) + "::json->>'" + field.name + "')";
  }).join(' OR ');


  var geoChangedClause = "geom IS NULL OR NOT ST_Equals(geom, ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, (temaDef.key.length + 2)) + ", 25832)))";
  var changedSql = "SELECT " + geoChangedClause + " AS geo_changed, (" + fieldsNotChangedClause + ") as fields_changed, geo_version FROM temaer" +
    " WHERE tema = '" + tema.tema + "'";
  temaDef.key.forEach(function (keySpec, index) {
    changedSql += " and fields->>'" + keySpec.name + "' = $" + (index + 1);
  });
  var changedParams = getKeyValue(tema, temaDef).concat([JSON.stringify(tema.fields)]).concat(tema.polygons);
  return client.queryp(changedSql, changedParams).then(function (result) {
    if (!result.rows) {
      return q.reject(new Error('Could not update DAGI tema, it was not found.'));
    }
    if (result.rows.length !== 1) {
      return q.reject(new Error('Could not update DAGI tema, unexpected number of rows to update'));
    }
    var geoChanged = result.rows[0].geo_changed;
    var fieldsChanged = result.rows[0].fields_changed;
    var geo_version = result.rows[0].geo_version;
    if (!geoChanged && !fieldsChanged) {
      return {
        rowCount: 0
      };
    }
    var updates = [];
    var updateParams = [];
    if (fieldsChanged) {
      updates.push("aendret = NOW()");
      updateParams.push(tema.fields);
      updates.push("fields = $" + updateParams.length);
    }
    if (geoChanged) {
      updates.push("geo_aendret = NOW()");
      updateParams.push(geo_version + 1);
      updates.push("geo_version = $" + updateParams.length);
      updates.push("geom = ST_Multi(ST_SetSRID(" + makeUnionSql(tema.polygons.length, updateParams.length + 1) + ", 25832))");
      updateParams = updateParams.concat(tema.polygons);
    }
    var updateSql = "UPDATE temaer SET " + updates.join(', ') + " WHERE " +
      temaDef.key.map(function (keySpec, index) {
        return "(fields->>'" + keySpec.name + "') = $" + (updateParams.length + index + 1) + "::text";
      }).join(" AND ");
    updateParams = updateParams.concat(temaDef.key.map(function (keySpec) {
      return tema.fields[keySpec.name];
    }));
    updateSql += " AND tema = $" + (updateParams.length + 1);
    updateParams.push(temaDef.singular);
    return client.queryp(updateSql, updateParams);
  }).nodeify(callback);
};

exports.parseGml = (gmlText, singular, key, mapping) => {
  return q.nfcall(xml2js.parseString, gmlText, {
    tagNameProcessors: [xml2js.processors.stripPrefix],
    trim: true
  }).then(function (result) {
    if (!result.FeatureCollection) {
      return q.reject(new Error('Unexpected contents in tema file file: ' + JSON.stringify(result)));
    }

    var features = result.FeatureCollection.featureMember;

    return _.chain(features)
      .filter(function (feature) {
        // Some files may contain feature types we dont want (e.g. ejerlav).
        return feature[mapping.wfsName];
      })
      .filter(mapping.filterFn)
      .map(function (feature) {
        return exports.wfsFeatureToTema(feature, mapping);
      })
      .groupBy(fragment => {
        const result = key.map(keyPart => fragment.fields[keyPart]).join(':');
        return result;
      })
      .map(function (fragments) {
        return {
          tema: singular,
          fields: fragments[0].fields,
          polygons: _.pluck(fragments, 'polygon')
        };
      })
      .value();
  });

}

exports.parseTemaer = function (gmlText, temaDef, mapping) {
  const singular = temaDef.singular;
  const key = _.pluck(temaDef.key, 'name');
  return exports.parseGml(gmlText, singular, key, mapping);
};

exports.wfsFeatureToTema = function (feature, mapping) {
  var featureCandidates = feature[mapping.wfsName];
  if (!featureCandidates) {
    logger.error("found no features, feature[" + mapping.wfsName + "], feature = ", JSON.stringify(feature));
  }
  var wfsFeature = featureCandidates[0];

  var result = {
    polygon: gml.gmlGeometryToWkt(wfsFeature[mapping.geometry][0])
  };
  result.fields = _.reduce(mapping.fields, function (memo, fieldMapping, fieldName) {
    var objWithProperty;
    if (fieldMapping.path) {
      objWithProperty = _.reduce(fieldMapping.path, function (memo, pathSegment) {
        if (!memo || !memo[pathSegment]) {
          return null;
        }
        return memo[pathSegment][0];
      }, wfsFeature);
    }
    else {
      objWithProperty = wfsFeature;
    }
    memo[fieldName] = fieldMapping.parseFn(objWithProperty[fieldMapping.name][0]);
    return memo;
  }, {});

  return result;
};

const updateAdresserTemaerView = (client, temaDef, initializing, maxChanges, disableNearestNeighbor, callback) => {
  return q.async(function*() {
    const selectCoveredMappings =
      `SELECT DISTINCT Adgangsadresser.id as adgangsadresse_id, gridded_temaer_matview.id as tema_id, '${temaDef.singular}'::tema_type as tema
      FROM Adgangsadresser_mat adgangsadresser JOIN gridded_temaer_matview  
      ON  ST_Covers(gridded_temaer_matview.geom, Adgangsadresser.geom) AND tema = '${temaDef.singular}'::tema_type`;

    const selectNearestMappings = coveredTable =>
      `WITH adrs AS (SELECT
    a.id,
      geom
    FROM adgangsadresser_mat a
    WHERE geom IS NOT NULL AND
    NOT exists
    (SELECT *
      FROM ${coveredTable} mv
    WHERE a.id = mv.adgangsadresse_id AND tema = '${temaDef.singular}'::tema_type))
    SELECT
    a.id as adgangsadresse_id,
    (SELECT t.id
    FROM gridded_temaer_matview t WHERE t.tema = '${temaDef.singular}'::tema_type
    ORDER BY t.geom <-> a.geom LIMIT 1) as tema_id,
      '${temaDef.singular}'::tema_type as tema
FROM adrs a`
    ;
    if (initializing) {
      yield sqlCommon.disableTriggersQ(client);
      yield client.queryp(`INSERT INTO adgangsadresser_temaer_matview(adgangsadresse_id, tema_id, tema) (${selectCoveredMappings})`);
      if (!disableNearestNeighbor && temaDef.useNearestForAdgangsadresseMapping) {
        yield client.queryp(`INSERT INTO adgangsadresser_temaer_matview(adgangsadresse_id, tema_id, tema) (${selectNearestMappings('adgangsadresser_temaer_matview')})`)
      }
      yield client.queryp(
        `INSERT INTO adgangsadresser_temaer_matview_history(adgangsadresse_id, tema_id, tema)
        (SELECT adgangsadresse_id, tema_id, '${temaDef.singular}'::tema_type FROM adgangsadresser_temaer_matview atm
        WHERE atm.tema = '${temaDef.singular}'::tema_type)`);
      yield sqlCommon.enableTriggersQ(client);
    }
    else {
      yield client.queryp(
        `CREATE TEMP TABLE tema_mapping_temp AS (${selectCoveredMappings})`);
      if (!disableNearestNeighbor && temaDef.useNearestForAdgangsadresseMapping) {
        yield client.queryp(`INSERT INTO tema_mapping_temp (adgangsadresse_id, tema_id, tema) (${selectNearestMappings('tema_mapping_temp')})`);
      }
      yield client.queryp(`CREATE TEMP VIEW tema_mapping_view_temp AS SELECT * FROM adgangsadresser_temaer_matview WHERE tema = '${temaDef.singular}'::tema_type`);
      const datamodel = datamodels.adgangsadresse_tema;
      yield tablediff.computeDifferencesTargeted(client, 'tema_mapping_temp', 'tema_mapping_view_temp', 'adgangsadresser_temaer_matview', datamodel.key, []);
      const changes = (yield client.queryp('SELECT (SELECT count(*) FROM insert_adgangsadresser_temaer_matview) + (SELECT count(*) FROM delete_adgangsadresser_temaer_matview) as c')).rows[0].c;
      if (changes > maxChanges) {
        logger.error('Antallet af ændringer til tema overskrider den tilladte grænse', {
          changes: changes,
          maxChanges: maxChanges,
          tema: temaDef.singular
        });
        throw new Error('Antallet af ændringer til tema overskrider den tilladte grænse');
      }
      yield tablediff.applyChanges(client, 'adgangsadresser_temaer_matview', 'adgangsadresser_temaer_matview', datamodel.key, datamodel.key, []);
      yield tablediff.dropChangeTables(client, 'adgangsadresser_temaer_matview');
      yield client.queryp('DROP TABLE tema_mapping_temp; DROP VIEW tema_mapping_view_temp');
    }

  })().nodeify(callback);
};

exports.findTema = function (temaNavn) {
  return _.findWhere(temaerApi, {singular: temaNavn});
};

exports.stringKey = function (tema, temaDef) {
  return temaDef.key.reduce(function (memo, keySpec) {
    return memo + tema.fields[keySpec.name];
  }, '');
};

exports.updateAdresserTemaerView = updateAdresserTemaerView;
