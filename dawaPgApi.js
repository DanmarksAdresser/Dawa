"use strict";

/******************************************************************************/
/*** Module setup *************************************************************/
/******************************************************************************/

var express     = require('express');
var JSONStream  = require('JSONStream');
var _           = require('underscore');
var pg          = require('pg');
var QueryStream = require('pg-query-stream');
var eventStream = require('event-stream');
var model       = require('./awsDataModel');
var utility     = require('./utility');
var ZSchema     = require("z-schema");
var csv         = require('csv');


/******************************************************************************/
/*** Configuration ************************************************************/
/******************************************************************************/

//var connString = "postgres://pmm@dkadrdevdb.co6lm7u4jeil.eu-west-1.rds.amazonaws.com:5432/dkadr";
// var connString = "postgres://ahj@localhost/dawa2";
var connString = process.env.pgConnectionUrl;
console.log("Loading dawaPgApi with process.env.pgConnectionUrl="+connString);


/******************************************************************************/
/*** Routes *******************************************************************/
/******************************************************************************/

exports.setupRoutes = function () {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());

  publishGetByKey(app, adresseApiSpec);
  publishQuery(app, adresseApiSpec);

//  app.get(/^\/adresser\/([0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12})(?:\.(\w+))?$/i, doAddressLookup);
//  app.get(/^\/adresser.json(?:(\w+))?$/i, doAddressSearch);
  app.get('/adresser/autocomplete', doAddressAutocomplete);

  return app;
};

function publishGetByKey(app, spec) {
  app.get('/' + spec.model.plural + '/:id', function (req, res) {
    var params = {id: req.params.id };
    var query = createSqlQueryFromSpec(spec, params);
    withPsqlClient(function (err, client, done) {
      if (err) {
        res.send(500, JSON.stringify(err));
      }
      client.query(query.sql,
        query.params,
        function (err, result) {
          done();
          if (err) {
            res.send(500, JSON.stringify(err));
          } else if (result.rows.length === 1) {
            var adr = spec.mappers.json(result.rows[0]);
            spec.model.validator(adr)
              .then(function (report) {
                res.send(200, JSON.stringify(adr));
              })
              .catch(function (err) {
                console.log(require('util').inspect(adr, true, 10));
                console.log(require('util').inspect(err, true, 10));
                res.send(500, err);
              });
          } else {
            res.send(500, {error: 'unknown id'});
          }
        });
    });
  });
}

function publishQuery(app, spec) {
  app.get('/' + spec.model.plural, function(req, res) {
    var query  = createSqlQueryFromSpec(spec, req.query);
    console.log('executing sql' + JSON.stringify(query));

    withPsqlClient(function(err, client, done) {
      var stream = streamingQuery(client, query.sql, query.params);
      var format = req.query.format;
      if(format === 'csv') {
        return streamCsvToHttpResponse(stream, spec, res, done);
      }
      else {
        return streamJsonToHttpResponse(stream, spec.mappers.json, res, done);
      }
    });
  });
}

function createSqlQueryFromSpec(spec, params) {
  var select = "  SELECT * FROM " + spec.model.plural;

  var whereClauses = [];
  var sqlParams  = [];
  var offsetLimitClause = "";

  if(spec.parameters) {
    spec.parameters.forEach(function(parameter) {
      var name = parameter.name;
      var column = spec.fieldMap[name].column || name;
      if(params[name] !== undefined) {
        sqlParams.push(params[name]);
        whereClauses.push(column + " = $" + sqlParams.length);
      }
    });
  }

  if(spec.pageable) {
    offsetLimitClause = createOffsetLimitClause(params);
  }

  return {
    sql: createSqlQuery(select, whereClauses, offsetLimitClause),
    params: sqlParams
  };
}

function streamCsvToHttpResponse(rowStream, spec, res, cb) {
  var fields = spec.fields;
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  var csvTransformer = csv();
  csvTransformer.to.options({
    header: true,
    columns: _.pluck(fields,'name')
  });
  var csvStream = eventStream.pipeline(
    rowStream,
    eventStream.mapSync(function(row) {
      return _.reduce(fields, function(memo, field) {
        memo[field.name] = row[field.column || field.name];
        return memo;
      }, {});
    }),
    csvTransformer
  );
  streamToHttpResponse(csvStream, res, cb);

}

function createSqlQuery(select, whereClauses, offsetLimitClause){
  var sql = select;
  if(whereClauses.length > 0) {
    sql +=  " WHERE " + whereClauses.join(" AND ");
  }
  sql += offsetLimitClause;
  return sql;
}

function createOffsetLimitClause(params) {
  var paging = utility.paginering(params);
  if(paging.status === 1) {
    return ' OFFSET ' + paging.skip + ' LIMIT ' + paging.limit;
  }
  else if(paging.status === 2) {
    // TODO send client error?
    return '';
  }
  else {
    return '';
  }
}

/**
 * Specificerer hvilke felter en adresse har, samt hvordan de mapper til kolonnenavne i databasen
 */
var adresseFields = [
  {
    name: 'id'
  },
  {
    name: 'vejkode'
  },
  {
    name: 'vejnavn'
  },
  {
    name: 'husnr'
  },
  {
    name: 'supplerendebynavn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'etage'
  },
  {
    name: 'dør',
    column: 'doer'
  },
  {
    name: 'adgangsadresseid'
  },
  {
    name: 'kommune',
    column: 'kommunekode'
  },
  {
    name: 'ejerlav',
    column: 'ejerlavkode'
  },
  {
    name: 'matrikel',
    column: 'matrikelnr'
  }
];

var adresseApiSpec = {
  model: model.adresse,
  pageable: true,
  searchable: true,
  fields: adresseFields,
  fieldMap: _.indexBy(adresseFields, 'name'),
  parameters: [
    {
      name: 'id'
//      type: parameterTypes.uuid
    },
    {
      name: 'vejkode'
    },
    {
      name: 'vejnavn'
    },
    {
      name: 'husnr'
    },
    {
      name: 'supplerendebynavn'
    },
    {
      name: 'postnr'
    },
    {
      name: 'etage'
    },
    {
      name: 'dør'
    },
    {
      name: 'adgangsadresseid'
    },
    {
      name: 'kommune'
    },
    {
      name: 'ejerlav'
    },
    {
      name: 'matrikel'
    }
  ],
  mappers: {
    json: mapAddress,
    csv: undefined
  }
};

/******************************************************************************/
/*** Address Lookup ***********************************************************/
/******************************************************************************/

function d(date) { return JSON.stringify(date); }
//function defaultVal(val, def) { return val ? val : def;}

function mapAddress(rs){
  return {id: rs.enhedsadresseid,
          version: d(rs.e_version),
          etage: rs.etage,
          dør: rs.doer,
          adressebetegnelse: "TODO",  //TODO
          adgangsadresse: mapAdganggsadresse(rs)};
}

function mapAdganggsadresse(rs){
  var slice = function(slice, str) { return ("00000000000"+str).slice(slice); };
  var adr = {};
  adr.id = rs.id;
  adr.version = d(rs.e_version);
  adr.vej = {navn: rs.vejnavn,
             kode: slice(-4, rs.vejkode)};
  adr.husnr = rs.husnr;
  //if (rs.bygningsnavn) adr.bygningsnavn = rs.bygningsnavn;
  if (rs.supplerendebynavn) adr.supplerendebynavn = rs.supplerendebynavn;
  adr.postnummer = {nr: slice(-4, rs.postnr),
                    navn: rs.postnrnavn};
  adr.kommune = {kode: slice(-4, rs.kommunekode),
                 navn: rs.kommunenavn};
  adr.ejerlav = {kode: slice(-8, rs.ejerlavkode),
                 navn: rs.ejerlavnavn};
  adr.matrikelnr = rs.matrikelnr;
  adr.historik = {oprettet: d(rs.e_oprettet),
                  'ændret': d(rs.e_aendret)};
  adr.adgangspunkt = {etrs89koordinat: {'øst': rs.oest,
                                        nord:  rs.nord},
                      wgs84koordinat:  {'længde': rs.lat,
                                        bredde: rs.long},
                      kvalitet:        {'nøjagtighed': rs.noejagtighed,
                                        kilde: rs.kilde,
                                        tekniskstandard: rs.tekniskstandard},
                      tekstretning:    rs.tekstretning,
                      'ændret':        d(rs.adressepunktaendringsdato)};
  adr.DDKN = {m100: rs.kn100mdk,
              km1:  rs.kn1kmdk,
              km10: rs.kn10kmdk};

  return adr;
}

/******************************************************************************/
/*** Address Search ***********************************************************/
/******************************************************************************/

//function doAddressSearch(req, res) {
//  var sql = "  SELECT * FROM adresser\n";
//
//  var whereClauses = [];
//  var whereParams  = [];
//  if (req.query.postnr) {
//    whereClauses.push("postnr = $1\n");
//    whereParams.push(parseInt(req.query.postnr));
//  }
//  if (req.query.polygon) {
//    // mapping GeoJson to WKT (Well-Known Text)
//    var p = JSON.parse(req.query.polygon);
//    var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
//    var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
//    var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
//    whereClauses.push("ST_Contains(ST_GeomFromText($2, 4326)::geometry, wgs84geom)\n");
//    whereParams.push(mapPolygon(p));
//  }
//  var where = "  WHERE "+whereClauses.join("        AND ");
//
//  withPsqlClient(function(err, client, done) {
//    var stream = eventStream.pipeline(
//      streamingQuery(client, sql+where, whereParams),
//      JSONStream.stringify()
//    );
//    streamJsonToHttpResponse(stream, res, done);
//  });
//}

/******************************************************************************/
/*** Address Autocomplete *****************************************************/
/******************************************************************************/

function doAddressAutocomplete(req, res) {
  var q = req.query.q;

  var tsq = toPgSuggestQuery(q);

  var postnr = req.query.postnr;

  var args = [tsq];
  if (postnr) {
    args.push(postnr);
  }

  withPsqlClient(function (err, client, done) {
    // TODO handle error

    // Search vejnavne first
    // TODO check, at DISTINCT ikke unorder vores resultat
    var vejnavneSql = 'SELECT DISTINCT vejnavn FROM (SELECT * FROM Vejnavne, to_tsquery(\'vejnavne\', $1) query WHERE (tsv @@ query)';

    if (postnr) {
      vejnavneSql += ' AND EXISTS (SELECT * FROM Enhedsadresser WHERE vejkode = Vejnavne.kode AND kommunekode = Vejnavne.kommunekode AND postnr = $2)';
    }

    vejnavneSql += 'ORDER BY ts_rank(Vejnavne.tsv, query) DESC) AS v LIMIT 10';

    client.query(vejnavneSql, args, function (err, result) {
      if (err) {
        console.error('error running query', err);
        // TODO reportErrorToClient(...)
        return done(err);
      }
      if (result.rows.length > 1) {
        streamJsonToHttpResponse(eventStream.readArray(result.rows), vejnavnRowToSuggestJson, res, done);
        return;
      }

      var sql = 'SELECT * FROM Adresser, to_tsquery(\'vejnavne\', $1) query  WHERE (e_tsv @@ query)';
      if (postnr) {
        sql += ' AND postnr = $2';
      }
      sql += ' ORDER BY ts_rank(Adresser.e_tsv, query) DESC';

      sql += ' LIMIT 10';


      var queryStream = streamingQuery(client, sql, args);
      streamJsonToHttpResponse(queryStream, adresseRowToSuggestJson, res, done);
    });
  });
}


function toPgSuggestQuery(q) {
  q = q.replace(/[^a-zA-Z0-9ÆæØøÅåéE]/g, ' ');

  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  var hasTrailingWhitespace = /.*\s$/.test(q);
  // remove leading / trailing whitespace
  q = q.replace(/^\s*/g, '');
  q = q.replace(/\s*$/g, '');


  // translate spaces into AND clauses
  var tsq = q.replace(/ /g, ' & ');

  // Since we do suggest, if there is no trailing whitespace,
  // the last search clause should be a prefix search
  if (!hasTrailingWhitespace) {
    tsq += ":*";
  }
  return tsq;
}

function vejnavnRowToSuggestJson(row) {
  return {
    id: '',
    vej: {
      kode: '',
      navn: row.vejnavn
    },
    husnr: '',
    etage: '',
    dør: '',
    bygningsnavn: '',
    supplerendebynavn: '',
    postnummer: {
      nr: '',
      navn: '',
      href: ''
    }
  };
}

function adresseRowToSuggestJson(row) {
  return {
    id: row.id,
    vej: {
      kode: row.vejkode,
      navn: row.vejnavn
    },
    husnr: row.husnr ? row.husnr : "",
    etage: row.etage ? row.etage : "",
    dør: row.doer ? row.doer : "",
    bygningsnavn: '',
    supplerendebynavn: '',
    postnummer: {
      nr: "" + row.postnr,
      navn: row.postnrnavn,
      href: 'http://dawa.aws.dk/kommuner/' + row.postnr
    }
  };
}


/******************************************************************************/
/*** Utility functions ********************************************************/
/******************************************************************************/

function withPsqlClient(cb) {
  return pg.connect(connString, cb);
}

function streamJsonToHttpResponse(stream, mapper, res, cb) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  var transformedStream = eventStream.pipeline(stream,
    eventStream.mapSync(mapper),
    JSONStream.stringify()
  );
  streamToHttpResponse(transformedStream, res, cb);
}

// pipe stream to HTTP response. Invoke cb when done. Pass error, if any, to cb.
function streamToHttpResponse(stream, res, cb) {

  res.on('error', function (err) {
    console.error("An error occured while streaming data to HTTP response", new Error(err));
    cb(err);
  });
  res.on('close', function () {
    console.log("Client closed connection");
    cb("Client closed connection");
  });
  res.on('finish', cb);
  stream.pipe(res);
}

function streamingQuery(client, sql, params) {
  return client.query(new QueryStream(sql, params, {batchSize: 10000}));
}

/******************************************************************************/
/*** Parameter parsing and validation *****************************************/
/******************************************************************************/

exports.parseParameters = function(params, parameterSpec) {
  var paramNames = _.filter(_.keys(params), function(name) {
    return parameterSpec[name] ? true : false;
  });
  return _.reduce(paramNames,
                  function(memo, name){
                    try{
                      var val = parseParameter(params[name], parameterSpec[name]);
                      memo.params[name] = val;
                    } catch(error){
                      memo.errors.push([name, error]);
                    }
                    return memo;
                  },
                  {params: {}, errors: []});
};

function parseParameter(valString, spec) {
  var val = parseParameterType(valString, spec.type);
  jsonSchemaValidation(val, spec.schema);
  return val;
}
function parseParameterType(valString, type) {
  if (type === undefined){
    return valString;
  } else {
    var val;
    try {
      val = JSON.parse(valString);
    }
    catch(error){
      throw 'notValidJSON';
    }
    if(type === 'string'){
      if (_.isString(val)) return val; else throw "notString";
    } else if(type === 'number'){
      if (_.isNumber(val)) return val; else throw "notNumber";
    } else if(type === 'array'){
      if (_.isArray(val)) return val; else throw "notArray";
    } else if(type === 'object'){
      if (_.isObject(val) && !_.isArray(val)) return val; else throw "notObject";
    }
    else {
      throw "unknownType";
    }
  }
}

function jsonSchemaValidation(val, schema){
  if (schema){
    try{
      zsValidate(val, schema);
    }
    catch(error){
      throw error.errors[0].message;
    }
  }
}

var validator = new ZSchema({ sync: true });
function zsValidate(json, schema){
  var valid = validator.validate(json, schema);
  if (!valid) {
    throw validator.getLastError();
  } else {
    return true;
  }
}
