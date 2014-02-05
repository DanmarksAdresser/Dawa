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
var utility     = require('./utility');
var util        = require('util');
var csv         = require('csv');
var parameterParsing = require('./parameterParsing');
var apiSpec = require('./apiSpec');


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

  publishGetByKey(app, apiSpec.adresse);
  publishQuery(app, apiSpec.adresse);

  //  app.get(/^\/adresser\/([0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12})(?:\.(\w+))?$/i, doAddressLookup);
  //  app.get(/^\/adresser.json(?:(\w+))?$/i, doAddressSearch);
  app.get('/adresser/autocomplete', doAddressAutocomplete);

  return app;
};

function publishGetByKey(app, spec) {
  app.get('/' + spec.model.plural + '/:id', function (req, res) {

    // Parsing query-parameters
    var parsedParams = parameterParsing.parseParameters({id: req.params.id}, _.indexBy(spec.parameters, 'name'));
    if (parsedParams.errors.length > 0){
      if (parsedParams.errors[0][0] == 'id' && parsedParams.errors.length == 1){
        return sendUUIDFormatError(res, "UUID is ill-formed: "+req.params.id+". "+parsedParams.errors[0][1]);
      } else {
        return sendInternalServerError(res, 'Unexpected query-parameter error: '+util.inspect(parsedParams.errors, {depth: 10}));
      }
    }

    // Making the query string
    var query = createSqlQueryFromSpec(spec, parsedParams.params);

    // Getting the data
    withPsqlClient(res, function (client, done) {
      client.query(
        query.sql,
        query.params,
        function (err, result) {
          done();
          if (err) {
            sendInternalServerError(res, err);
          } else if (result.rows.length === 1) {
            var adr = spec.mappers.json(result.rows[0]);
            spec.model.validator(adr)
              .then(function (report) {
                // The good case.  The rest is error handling!
                res.send(200, JSON.stringify(adr));
              })
              .catch(function (err) {
                sendInternalServerError(res, err);
              });
          } else if (result.rows.length > 1) {
            sendInternalServerError(res, "UUID: "+req.params.id+", results in more than one address: "+result.rows);
          } else {
            sendAddressNotFoundError(res, "UUID: "+req.params.id+", match no address");
          }
        });
    });
  });
}

function publishQuery(app, spec) {
  app.get('/' + spec.model.plural, function(req, res) {

    // Parsing query-parameters
    var parsedParams = parameterParsing.parseParameters(req.query, _.indexBy(spec.parameters, 'name'));
    if (parsedParams.errors.length > 0){
      return sendQueryParameterFormatError(res, parsedParams.errors);
    }

    // Parsing paging-parameters
    var pagingParams = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.pagingParameterSpec, 'name'));
    if(pagingParams.errors.length > 0) {
      return sendQueryParameterFormatError(res, pagingParams.errors);
    }

    var formatParamParseResult = parameterParsing.parseParameters(req.query, _.indexBy(apiSpec.formatParameterSpec, 'name'));
    if(formatParamParseResult.errors.length > 0) {
      return sendQueryParameterFormatError(res, formatParamParseResult.errors);
    }
    applyDefaultPaging(pagingParams.params);

    // Making the query string
    var query = createSqlQueryFromSpec(spec, parsedParams.params, pagingParams.params);
    console.log('executing sql' + JSON.stringify(query));

    // Getting the data
    withPsqlClient(res, function(client, done) {
      var stream = streamingQuery(client, query.sql, query.params);
      var format = formatParamParseResult.params.format;
      if(format === 'csv') {
        return streamCsvToHttpResponse(stream, spec, res, done);
      }
      else if(format === 'jsonp') {
        // TODO validate/sanitize callback parameter
        return streamJsonpToHttpResponse(stream, spec.mappers.json, req.query.callback, res, done);
      }
      else {
        return streamJsonToHttpResponse(stream, spec.mappers.json, res, done);
      }
    });
  });
}
/**
 * By default, if per_side is specified, side defaults to 1.
 * If side is specified, per_side defaults to 20.
 * @param pagingParams
 */
function applyDefaultPaging(pagingParams) {
  if(pagingParams.per_side && !pagingParams.side) {
    pagingParams.side = 1;
  }
  if(pagingParams.side && !pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
}

function createSqlQueryFromSpec(spec, params, pagingParams) {
  var select = "  SELECT * FROM " + spec.model.plural;

  var whereClauses = [];
  var sqlParams  = [];
  var offsetLimitClause = "";

  if(spec.parameters) {
    spec.parameters.forEach(function(parameter) {
      var name = parameter.name;
      if(params[name] !== undefined) {
        sqlParams.push(params[name]);
        if (parameter.whereClause) {
          whereClauses.push(parameter.whereClause("$" + sqlParams.length));
        } else {
          var column = spec.fieldMap[name].column || name;
          whereClauses.push(column + " = $" + sqlParams.length);
        }
      }
    });
  }

  if(spec.pageable && pagingParams) {
    offsetLimitClause = createOffsetLimitClause(pagingParams);
  }

  return {
    sql: createSqlQuery({
      select : select,
      whereClauses: whereClauses,
      orderBy: spec.model.key,
      offsetLimitClause: offsetLimitClause
    }),
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
  streamToHttpResponse(csvStream, res, {}, cb);

}

function createSqlQuery(parts){
  var sql = parts.select;
  if(parts.whereClauses.length > 0) {
    sql +=  " WHERE " + parts.whereClauses.join(" AND ");
  }
  if(parts.orderBy) {
    sql += " ORDER BY " + parts.orderBy;
  }
  if(parts.offsetLimitClause) {
    sql += parts.offsetLimitClause;
  }
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
//  withPsqlClient(function(client, done) {
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

  withPsqlClient(res, function (client, done) {
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

function withPsqlClient(res, callback) {
  return pg.connect(connString, function (err, client, done) {
    if (err) {
      // We do not have a connection to PostgreSQL.
      // About!
      sendInternalServerError(res, err);
      process.exit(1);
    }
    callback(client, done);
  });
}

function streamJsonpToHttpResponse(stream, mapper, callbackName, res, done) {
  res.setHeader('Content-Type', "application/javascript; charset=UTF-8");
  var jsonStream = createJsonStream(stream, mapper);
  res.write(callbackName + "(");
  streamToHttpResponse(jsonStream, res, { end: false }, function(err) {
    if(err) {
      return done(err);
    }
    res.end(");");
    done();
  });

}

function createJsonStream(stream, mapper) {
  return eventStream.pipeline(stream,
    eventStream.mapSync(mapper),
    JSONStream.stringify()
  );
}
function streamJsonToHttpResponse(stream, mapper, res, cb) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  var transformedStream = createJsonStream(stream, mapper);
  streamToHttpResponse(transformedStream, res, {}, cb);
}

// pipe stream to HTTP response. Invoke cb when done. Pass error, if any, to cb.
function streamToHttpResponse(stream, res, options, cb) {

  res.on('error', function (err) {
    console.error("An error occured while streaming data to HTTP response", new Error(err));
    cb(err);
  });
  res.on('close', function () {
    console.log("Client closed connection");
    cb("Client closed connection");
  });
  if(options.end === false) {
    stream.on('end', cb);
  }
  else {
    res.on('finish', cb);
  }
  stream.pipe(res, options);
}

function streamingQuery(client, sql, params) {
  return client.query(new QueryStream(sql, params, {batchSize: 10000}));
}

function sendQueryParameterFormatError(res, details){
  sendError(res, 400, {type: "QueryParameterFormatError",
                       title: "One or more query parameters was ill-formed.",
                       details: details});
}

function sendUUIDFormatError(res, details){
  sendError(res, 400, {type: "UUIDFormatError",
                       title: "The address-UUID was ill-formed.",
                       details: details});
}

function sendAddressNotFoundError(res, details){
  sendError(res, 404, {type: "AddressNotFoundError",
                       title: "The given UUID does not match any address.",
                       details: details});
}

function sendInternalServerError(res, details){
  var msg = {type: "InternalServerError",
             title: "Something unexpected happened inside the server.",
             details: details};
  console.log("Internal server error: "+util.inspect(msg, {depth: 20}));
  sendError(res, 500, msg);
}

function sendError(res, code, message){
  res.setHeader('Content-Type', 'application/problem+json; charset=UTF-8');
  res.send(code, JSON.stringify(message));
}

