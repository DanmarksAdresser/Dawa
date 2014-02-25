"use strict";

var model       = require('./awsDataModel');
var _           = require('underscore');
var apiSpecUtil = require('./apiSpecUtil');
var winston     = require('winston');
var dbapi = require('./dbapi');


var kode4String = apiSpecUtil.kode4String;

/**
 * Applies a list of parameters to a query by generating the
 * appropriate where clauses.
 */
function applyParameters(spec, parameterSpec, params, query) {
  parameterSpec.forEach(function (parameter) {
    var name = parameter.name;
    if (params[name] !== undefined) {
      var parameterAlias = dbapi.addSqlParameter(query, params[name]);
      var column = apiSpecUtil.getColumnNameForWhere(spec, name);
      query.whereClauses.push(column + " = " + parameterAlias);
    }
  });
}

function maybeNull(val) {
  if(val === undefined) {
    return null;
  }
  return val;
}

var schema =  {
  uuid: {type: 'string',
    pattern: '^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'},
  postnr: {type: 'integer',
    minimum: 1000,
    maximum: 9999},
  polygon: {type: 'array',
    items: { type: 'array'}},
  positiveInteger: {type: 'integer',
    minimum: 1
  },
  kode4: {
    type: 'integer',
    minimum: 0,
    maximum: 9999
  }
};

function makeHref(baseUrl, spec, idArray) {
  return baseUrl +'/' + spec.model.plural + '/' + idArray.join('/');
}

function mapKommuneRef(dbJson, baseUrl) {
  if(dbJson) {
    return {
      href: makeHref(baseUrl, module.exports.kommune, [dbJson.kode]),
      kode: kode4String(dbJson.kode),
      navn: dbJson.navn
    };
  }
  return null;
}

function mapKommuneRefArray(array, baseUrl) {
  return _.map(array.filter(function(kommune) { return notNull(kommune.kode); }), function(kommune) { return mapKommuneRef(kommune, baseUrl); });
}


function mapPostnummerRefArray(array, baseUrl) {
  return _.map(array.filter(function(postnr) { return notNull(postnr.nr); }), function(postnummer) { return mapPostnummerRef(postnummer, baseUrl); });
}

function mapPostnummerRef(dbJson, baseUrl) {
  if(dbJson) {
    return {
      href: makeHref(baseUrl, module.exports.postnummer, [dbJson.nr]),
      nr: kode4String(dbJson.nr),
      navn: dbJson.navn
    };
  }
  return null;
}

/**
 * By default, if per_side is specified, side defaults to 1.
 * If side is specified, per_side defaults to 20.
 */
function applyDefaultPaging(pagingParams) {
  if(pagingParams.per_side && !pagingParams.side) {
    pagingParams.side = 1;
  }
  if(pagingParams.side && !pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
}

function toOffsetLimit(paging) {
  if(paging.side && paging.per_side) {
    return {
      offset: (paging.side-1) * paging.per_side,
      limit: paging.per_side
    };
  }
  else {
    return {};
  }
}
function applyOrderByKey(spec, sqlParts) {
  var columnArray = apiSpecUtil.getKeyForSelect(spec);
  columnArray.forEach(function (key) {
    sqlParts.orderClauses.push(apiSpecUtil.getColumnNameForSelect(spec, key));
  });
}

var crsParameterSpec = {
  parameters: [
    {
      name: 'srid',
      type: 'integer'
    }
  ]
};

var geomWithinParameterSpec = {
  parameters:[
    {
      name: 'polygon',
      type: 'json',
      schema: schema.polygon
    },
    {
      name: 'cirkel',
      type: 'string'
    }
  ],
  applySql: function(sqlParts, params, spec) {
    var srid = params.srid || 4326;
    var sridAlias;
    if(params.polygon || params.cirkel) {
      sridAlias = dbapi.addSqlParameter(sqlParts, srid);
    }
    if(params.polygon) {
      var polygonAlias = dbapi.addSqlParameter(sqlParts, polygonTransformer(params.polygon));
      dbapi.addWhereClause(sqlParts, "ST_Contains(ST_Transform(ST_GeomFromText("+ polygonAlias +", " + sridAlias + "), 25832), geom)");
    }
    if(params.cirkel) {
      var args = params.cirkel.split(',');
      var x = args[0];
      var y = args[1];
      var r = args[2];
      var point = "POINT(" + x + " " + y + ")";
      var pointAlias = dbapi.addSqlParameter(sqlParts, point);
      var radiusAlias = dbapi.addSqlParameter(sqlParts, r);
      dbapi.addWhereClause(sqlParts, "ST_DWithin(geom, ST_Transform(ST_GeomFromText(" + pointAlias + ","+sridAlias + "), 25832), " + radiusAlias + ")");
    }
  }
};

exports.pagingParameterSpec = {
  parameters: [
    {
      name: 'side',
      type: 'integer',
      schema: schema.positiveInteger
    },
    {
      name: 'per_side',
      type: 'integer',
      schema: schema.positiveInteger
    }
  ],
  applySql: function(sqlParts, params, spec) {
    applyDefaultPaging(params);
    var offsetLimit = toOffsetLimit(params);
    _.extend(sqlParts, offsetLimit);
    if(params.per_side) {
      applyOrderByKey(spec ,sqlParts);
    }
  }
};
exports.formatParameterSpec = {
  parameters: [
    {
      name: 'format',
      schema: {
        "enum": ['csv', 'json']
      }
    },
    {
      name: 'callback',
      schema: {
        type: 'string',
        pattern: '^[\\$_a-zA-Z0-9]+$'
      }
    }
  ]};
exports.searchParameterSpec = {
  parameters: [
    {
      name: 'q',
      type: 'string'
    }
  ],
  applySql: function(sqlParts, params, spec) {
    if(notNull(params.q)) {
      var parameterAlias = dbapi.addSqlParameter(sqlParts, toPgSearchQuery(params.q));
      dbapi.addWhereClause(sqlParts, searchWhereClause(parameterAlias, spec));
    }
  }
};
exports.autocompleteParameterSpec = {
  parameters: [
    {
      name: 'q',
      type: 'string'
    }
  ],
  applySql: function(sqlParts, params, spec) {
    if(notNull(params.q)) {
      var parameterAlias = dbapi.addSqlParameter(sqlParts, toPgSuggestQuery(params.q));
      dbapi.addWhereClause(sqlParts, searchWhereClause(parameterAlias, spec));
    }
  }
};

var adgangsadresseFields = [
  {
    name: 'id',
    column: 'a_id'
  },
  {
    name: 'vejkode',
    formatter: kode4String
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
    name: 'postnr',
    formatter: kode4String
  },
  {
    name: 'postnrnavn'
  },
  {
    name: 'bygningsnavn'
  },
  {
    name: 'kommunekode',
    formatter: kode4String
  },
  {
    name: 'kommunenavn'
  },
  {
    name: 'ejerlavkode'
  },
  {
    name: 'ejerlavnavn'
  },
  {
    name: 'matrikelnr'
  },
  {
    name: 'esrejendomsnr'
  },
  {
    name: 'etrs89koordinat_øst',
    column: 'oest'
  },
  {
    name: 'etrs89koordinat_nord',
    column: 'nord'
  },
  {
    name: 'wgs84koordinat_bredde',
    column: 'lat'
  },
  {
    name: 'wgs84koordinat_længde',
    column: 'long'
  },
  {
    name: 'nøjagtighed',
    column: 'noejagtighed'
  },
  {
    name: 'kilde'
  },
  {
    name: 'tekniskstandard'
  },
  {
    name: 'tekstretning'
  },
  {
    name: 'DDKN_m100',
    column: 'kn100mdk'
  },
  {
    name: 'DDKN_km1',
    column: 'kn1kmdk'
  },
  {
    name: 'DDKN_km10',
    column: 'kn10kmdk'
  },
  {
    name: 'tsv',
    selectable: false
  }
];
/**
 * Specificerer hvilke felter en adresse har, samt hvordan de mapper til kolonnenavne i databasen
 * Felterne anvendes som kolonner i CSV-formateringen af adresser.
 */
var adresseFields = [
  {
    name: 'id',
    column: 'e_id'
  },
  {
    name: 'vejkode',
    formatter: kode4String
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
    name: 'postnrnavn'
  },
  {
    name: 'bygningsnavn'
  },
  {
    name: 'kommunekode',
    formatter: kode4String
  },
  {
    name: 'kommunenavn'
  },
  {
    name: 'ejerlavkode'
  },
  {
    name: 'ejerlavnavn'
  },
  {
    name: 'matrikelnr'
  },
  {
    name: 'esrejendomsnr'
  },
  {
    name: 'etrs89koordinat_øst',
    column: 'oest'
  },
  {
    name: 'etrs89koordinat_nord',
    column: 'nord'
  },
  {
    name: 'wgs84koordinat_bredde',
    column: 'lat'
  },
  {
    name: 'wgs84koordinat_længde',
    column: 'long'
  },
  {
    name: 'nøjagtighed',
    column: 'noejagtighed'
  },
  {
    name: 'kilde'
  },
  {
    name: 'tekniskstandard'
  },
  {
    name: 'tekstretning'
  },
  {
    name: 'DDKN_m100',
    column: 'kn100mdk'
  },
  {
    name: 'DDKN_km1',
    column: 'kn1kmdk'
  },
  {
    name: 'DDKN_km10',
    column: 'kn10kmdk'
  },
  {
    name: 'etage'
  },
  {
    name: 'dør',
    column: 'doer'
  },
  {
    name: 'adgangsadresseid',
    column: 'a_id'
  },
  {
    name: 'tsv',
    column: 'e_tsv',
    selectable: false
  }
];

function propertyFilterParameterGroup(parameters) {
  var result = {
    parameters: parameters
  };
  result.applySql = function(sqlParts, params, spec) {
    return applyParameters(spec, parameters, params, sqlParts);
  };
  return result;
}

var adgangsadresseFilterParameters = propertyFilterParameterGroup([
    {
      name: 'id',
      type: 'string',
      schema: schema.uuid
    },
    {
      name: 'vejkode',
      type: 'integer',
      schema: schema.kode4
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
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4
    },
    {
      name: 'ejerlavkode',
      type: 'integer'
    },
    {
      name: 'matrikelnr'
    },
    {
      name: 'esrejendomsnr',
      type: 'integer'
    }
  ]);

var adresseParameters = adgangsadresseFilterParameters.parameters.concat([
  {
    name: 'etage'
  },
  {
    name: 'dør'
  },
  {
    name: 'adgangsadresseid'
  }
]);

function searchWhereClause(paramNumberString, spec) {
  var columnName = apiSpecUtil.getSearchColumn(spec);
  return "(" + columnName + " @@ to_tsquery('danish', " + paramNumberString + "))";
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


function toPgSearchQuery(q) {
  // remove all special chars
  q = q.replace(/[^a-zA-Z0-9ÆæØøÅåéE\*]/g, ' ');

  // replace '*' not at the end of a token with ' '
  q = q.replace(/[\*]([^ ])/g, ' $1');

  // remove any tokens consisting only of '*'
  q = q.replace(/(^|[ ])[\*]/g, ' ');

  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  // remove leading / trailing whitespace
  q = q.replace(/^\s*/g, '');
  q = q.replace(/\s*$/g, '');

  // tokenize the query
  var tokens = q.split(' ');

  tokens = _.map(tokens, function(token) {
    if(endsWith(token, '*')) {
      token = token.substring(0, token.length - 1) + ':*';
    }
    return token;
  });

  return tokens.join(' & ');
}

function endsWith (str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function toPgSuggestQuery(q) {
  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  var hasTrailingWhitespace = /.*\s$/.test(q);
  var tsq = toPgSearchQuery(q);

  // Since we do suggest, if there is no trailing whitespace,
  // the last search clause should be a prefix search
  if (!hasTrailingWhitespace && !endsWith(tsq, '*')) {
    tsq += ":*";
  }
  return tsq;
}


function polygonTransformer(paramValue){
  var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
  var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
  var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
  return mapPolygon(paramValue);
}

function d(date) {
  if(date instanceof Date) {
    return date.toString();
  }
  else if(date) {
    return date;
  }
  else {
    return null;
  }
}
//function defaultVal(val, def) { return val ? val : def;}

function adressebetegnelse(adresseRow, adgangOnly) {
  var adresse = adresseRow.vejnavn;
  if(adresseRow.husnr) {
    adresse += ' ' + adresseRow.husnr;
  }
  if(!adgangOnly) {
    if(adresseRow.etage) {
      adresse += ' ' + adresseRow.etage + '.';
    }
    if(adresseRow.doer) {
      adresse += ' ' + adresseRow.doer;
    }
  }
  adresse += '\n';
  if(adresseRow.supplerendebynavn) {
    adresse += adresseRow.supplerendebynavn + '\n';
  }
  adresse += adresseRow.postnr + ' ' + adresseRow.postnrnavn;
  return adresse;
}

function mapAdresse(rs, options){
  var adr = {};
  adr.id = rs.e_id;
  adr.href = makeHref(options.baseUrl, adresseApiSpec, [rs.e_id]);
  adr.etage = maybeNull(rs.etage);
  adr.dør = maybeNull(rs.doer);
  adr.adressebetegnelse = adressebetegnelse(rs);
  adr.adgangsadresse = mapAdgangsadresse(rs, options);
  return adr;
}

function mapAdgangsadresse(rs, options){
  var adr = {};
  adr.href = makeHref(options.baseUrl, adgangsadresseApiSpec, [rs.a_id]);
  adr.id = rs.a_id;
  adr.vejstykke = {
    href: makeHref(options.baseUrl, vejstykkeSpec, [rs.vejkode]),
    navn: maybeNull(rs.vejnavn),
    kode: kode4String(rs.vejkode)
  };
  adr.husnr = rs.husnr;
  adr.bygningsnavn = maybeNull(rs.bygningsnavn);
  adr.supplerendebynavn = maybeNull(rs.supplerendebynavn);
  adr.postnummer = mapPostnummerRef({nr: rs.postnr, navn: rs.postnrnavn}, options.baseUrl);
  adr.kommune = mapKommuneRef({kode: rs.kommunekode, navn: rs.kommunenavn}, options.baseUrl);
  if(rs.ejerlavkode) {
    adr.ejerlav = {
      kode: rs.ejerlavkode,
      navn: rs.ejerlavnavn
    };
  }
  else {
    adr.ejerlav = null;
  }
  adr.esrejendomsnr = maybeNull(rs.esrejendomsnr);
  adr.matrikelnr = maybeNull(rs.matrikelnr);
  adr.historik = {
    oprettet: d(rs.a_oprettet),
    ikrafttrædelse: d(rs.a_ikraftfra),
    'ændret': d(rs.a_aendret)
  };
  adr.adgangspunkt = {
    etrs89koordinat: rs.oest && rs.nord ? {
      'øst': rs.oest,
      nord:  rs.nord
    } : null,
    wgs84koordinat: rs.lat && rs.long ?  {
      'længde': rs.lat,
      bredde: rs.long
    } : null,
    'nøjagtighed': maybeNull(rs.noejagtighed),
    kilde: maybeNull(rs.kilde),
    tekniskstandard: maybeNull(rs.tekniskstandard),
    tekstretning:    maybeNull(rs.tekstretning),
    'ændret':        d(rs.adressepunktaendringsdato)
  };
  adr.DDKN = rs.kn100mdk || rs.kn1kmdk || rs.kn10kmdk ? {
    m100: maybeNull(rs.kn100mdk),
    km1:  maybeNull(rs.kn1kmdk),
    km10: maybeNull(rs.kn10kmdk)
  } : null;
  adr.sogn = null;
  adr.region = null;
  adr.retskreds = null;
  adr.politikreds = null;
  adr.opstillingskreds = null;
  adr.afstemningsområde = null;
  return adr;
}

function adresseRowToAutocompleteJson(row, options) {
  function adresseText(row) {
    return adressebetegnelse(row).replace(/\n/g, ', ');
  }
  return {
    tekst: adresseText(row),
    adresse: {
      id: row.e_id,
      href: makeHref(options.baseUrl, adresseApiSpec, [row.e_id])
    }
  };
}

function adgangsadresseRowToAutocompleteJson(row, options) {
  function adresseText(row) {
    return adressebetegnelse(row, true).replace(/\n/g, ', ');
  }
  return {
    tekst: adresseText(row),
    adgangsadresse: {
      id: row.a_id,
      href: makeHref(options.baseUrl, adgangsadresseApiSpec, [row.a_id])
    }
  };
}


var adresseApiSpec = {
  model: model.adresse,
  fields: adresseFields,
  fieldMap: _.indexBy(adresseFields, 'name'),
  parameterGroups: {
    propertyFilter: propertyFilterParameterGroup(adresseParameters),
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec,
    crs: crsParameterSpec,
    geomWithin: geomWithinParameterSpec
  },
  mappers: {
    json: mapAdresse,
    autocomplete: adresseRowToAutocompleteJson
  }
};

var adgangsadresseApiSpec = {
  model: model.adgangsadresse,
  fields: adgangsadresseFields,
  fieldMap: _.indexBy(adgangsadresseFields, 'name'),
  parameterGroups: {
    propertyFilter: adgangsadresseFilterParameters,
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec,
    crs: crsParameterSpec,
    geomWithin: geomWithinParameterSpec
  },
  mappers: {
    json: mapAdgangsadresse,
    autocomplete: adgangsadresseRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select: 'SELECT * from AdgangsadresserView',
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  }
};


var vejnavnFields = [
  {
    name: 'navn',
    column: 'vejstykker.vejnavn'
  },
  {
    name: 'postnr',
    selectable: false,
    column: 'vp1.postnr'
  },
  {
    name: 'kommunekode',
    selectable: false,
    column: 'vejstykker.kommunekode'
  },
  {
    name: 'tsv',
    column: 'vejstykker.tsv',
    selectable : false
  }
];

var vejnavnJsonMapper = function(row, options) {
  return {
    href: makeHref(options.baseUrl, vejnavnApiSpec, [row.navn]),
    navn: row.navn,
    postnumre: mapPostnummerRefArray(row.postnumre, options.baseUrl),
    kommuner: mapKommuneRefArray(row.kommuner, options.baseUrl)

};
};

function vejnavnRowToAutocompleteJson(row, options) {
  return {
    tekst: row.navn,
    vejnavn: {
      href: makeHref(options.baseUrl, vejnavnApiSpec, [row.navn]),
      navn: row.navn
    }
  };
}

var vejnavnPropertyFilterParameterGroup = propertyFilterParameterGroup([
    {
      name: 'navn'
    },
    {
      name: 'postnr',
      type: 'integer',
      schema: schema.postnr
    },
    {
      name: 'kommunekode',
      type: 'integer',
      schema: schema.kode4
    }
  ]);

var vejnavnApiSpec = {
  model: model.vejnavn,
  fields: vejnavnFields,
  fieldMap: _.indexBy(vejnavnFields, 'name'),
  parameterGroups: {
    propertyFilter: vejnavnPropertyFilterParameterGroup,
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec
  },
  mappers: {
    json: vejnavnJsonMapper,
    autocomplete: vejnavnRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select: 'SELECT vejstykker.vejnavn as navn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) AS postnumre,' +
        ' json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner' +
        ' FROM vejstykker' +
        ' LEFT JOIN kommuner k ON vejstykker.kommunekode = k.kode' +
        ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
        ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
        ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)',
      whereClauses: [],
      groupBy: 'vejstykker.vejnavn',
      orderClauses: [],
      sqlParams: []
    };
  }
};

var postnummerFields = [
  {
    name: 'nr',
    column: {
      select: 'nr',
      where: 'm.postnr'
    },
    formatter: kode4String
  },
  {name: 'navn', column: 'p.navn'},
  {name: 'kommuner'},
  {name: 'version', column: 'p.version'},
  {name: 'kommune', selectable: false, column: 'n.kommunekode'},
  {name: 'tsv', selectable: false, column: 'p.tsv'}
];

var postnummerSpec = {
  model: model.postnummer,
  fields: postnummerFields,
  fieldMap: _.indexBy(postnummerFields, 'name'),
  parameterGroups: {
    propertyFilter: propertyFilterParameterGroup(
      [
        {name: 'nr'},
        {name: 'navn'},
        {name: 'kommune'}
      ]),
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec
  },
  mappers: {
    json: postnummerJsonMapper,
    autocomplete: postnummerRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select:''+
        'SELECT  p.nr, p.navn, p.version, json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner '+
        'FROM PostnumreKommunekoderMat m '+
        'LEFT JOIN PostnumreKommunekoderMat n ON m.postnr = n.postnr '+
        'LEFT JOIN postnumre p ON p.nr = m.postnr ' +
        ' LEFT JOIN kommuner k ON m.kommunekode = k.kode',
      whereClauses: [],
      groupBy: 'p.nr, p.navn, p.version',
      orderClauses: [],
      sqlParams: []
    };
  }
};

function postnummerJsonMapper(row, options) {
  return {
    href: makeHref(options.baseUrl, module.exports.postnummer, [row.nr]),
    nr:  kode4String(row.nr),
    navn: row.navn,
    version: row.version,
    stormodtageradresse: null,
    kommuner: mapKommuneRefArray(row.kommuner,options.baseUrl)
  };
}

function postnummerRowToAutocompleteJson(row, options) {
  return {
    tekst: row.nr + ' ' + row.navn,
    postnummer: mapPostnummerRef(row, options.baseUrl)
  };
}

var vejstykkeFields = [
  {
    name: 'kode',
    column: 'vejstykker.kode',
    formatter: kode4String
  },
  {
    name: 'kommunekode',
    column: 'vejstykker.kommunekode',
    formatter: kode4String
  },
  {
    name: 'navn',
    column: 'vejnavn'
  },
  {
    name: 'postnr',
    selectable: false,
    column: 'vp2.postnr'
  },
  {
    name: 'tsv',
    column: 'vejstykker.tsv',
    selectable: false
  }
];

function notNull(obj) {
  return obj !== undefined && obj !== null;
}

function vejstykkeJsonMapper(row, options) {
  return {
    href: makeHref(options.baseUrl, vejstykkeSpec, [row.kommunekode, row.kode]),
    kode: kode4String(row.kode),
    navn: row.vejnavn,
    kommune: mapKommuneRef({ kode: row.kommunekode, navn: row.kommunenavn}, options.baseUrl),
    postnumre: mapPostnummerRefArray(row.postnumre, options.baseUrl)
  };
}

function vejstykkeRowToAutocompleteJson(row, options) {
  return {
    tekst: row.vejnavn,
    vejstykke: {
      href: makeHref(options.baseUrl, vejstykkeSpec, [row.kommunekode, row.kode]),
      kommunekode: kode4String(row.kommunekode),
      kode: kode4String(row.kode),
      navn: row.vejnavn
    }
  };
}


var vejstykkeSpec = {
  model: model.vejstykke,
  fields: vejstykkeFields,
  fieldMap: _.indexBy(vejstykkeFields, 'name'),
  parameterGroups: {
    propertyFilter: propertyFilterParameterGroup([
      {
        name: 'kode'
      },
      {
        name: 'kommunekode',
        type: 'integer',
        schema: schema.kode4
      },
      {
        name: 'navn'
      },
      {
        name: 'postnr',
        type: 'integer',
        schema: schema.postnr
      }
    ]),
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec
  },
  mappers: {
    json: vejstykkeJsonMapper,
    autocomplete: vejstykkeRowToAutocompleteJson
  },
  baseQuery: function() {
    return {
      select: 'SELECT vejstykker.kode, vejstykker.kommunekode, vejstykker.version, vejnavn, vejstykker.tsv, max(kommuner.navn) AS kommunenavn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) AS postnumre' +
        ' FROM vejstykker' +
        ' LEFT JOIN kommuner ON vejstykker.kommunekode = kommuner.kode' +

        ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
        ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
        ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)',
      whereClauses: [],
      groupBy: 'vejstykker.kode, vejstykker.kommunekode',
      orderClauses: [],
      sqlParams: []
    };
  }
};


var kommuneFields = [{name: 'kode', formatter: kode4String}, {name: 'navn'}, {name: 'tsv', selectable: false}];

var kommuneApiSpec = {
  model: model.kommune,
  fields: kommuneFields,
  fieldMap: _.indexBy(kommuneFields, 'name'),
  parameterGroups: {
    propertyFilter: propertyFilterParameterGroup([{name: 'navn'},
      {name: 'kode',
        type: 'integer'}
    ]),
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec
  },
  mappers: {
    json: kommuneJsonMapper,
    autocomplete: kommuneRowToAutocompleteJson
  }
};


function kommuneJsonMapper(row, options) {
  return {
    href: makeHref(options.baseUrl, kommuneApiSpec, [row.kode]),
    kode: kode4String(row.kode),
    navn: row.navn
  };
}

function kommuneRowToAutocompleteJson(row, options) {
  return {
    tekst: row.navn,
    kommune: mapKommuneRef(row, options.baseUrl)
  };
}

var supplerendeBynavnFields = [
  {
    name: 'navn',
    column: 'supplerendebynavn'
  },
  {
    name: 'kommunekode',
    selectable: false,
    column: 'supplerendebynavne.kommunekode'
  },
  {
    name: 'postnr',
    selectable: false,
    column: 'supplerendebynavne.postnr'
  },
  {
    name: 'tsv',
    selectable: false,
    column: 'supplerendebynavne.tsv'
  }
];

var supplerendeByavnJsonMapper = function(row, options) {
  var baseUrl = options.baseUrl;
  return {
    href: makeHref(baseUrl, supplerendeBynavnApiSpec, [row.supplerendebynavn]),
    navn: row.supplerendebynavn,
    postnumre: mapPostnummerRefArray(row.postnumre, baseUrl),
    kommuner: mapKommuneRefArray(row.kommuner, baseUrl)
  };
};

var supplerendeBynavnAutocompleteMapper = function(row, options) {
  return {
    tekst: row.supplerendebynavn,
    supplerendebynavn: {
      href:  makeHref(options.baseUrl, supplerendeBynavnApiSpec, [row.supplerendebynavn]),
      navn: row.supplerendebynavn
    }
  };
};

var supplerendeBynavnApiSpec = {
  model: model.supplerendebynavn,
  fields: supplerendeBynavnFields,
  fieldMap: _.indexBy(supplerendeBynavnFields, 'name'),
  parameterGroups: {
    propertyFilter: propertyFilterParameterGroup([
      {
        name: 'navn'
      },
      {
        name: 'kommunekode',
        type: 'integer',
        schema: schema.kode4
      },
      {
        name: 'postnr'
      }
    ]),
    search: exports.searchParameterSpec,
    autocomplete: exports.autocompleteParameterSpec
  },
  mappers: {
    json: supplerendeByavnJsonMapper,
    autocomplete: supplerendeBynavnAutocompleteMapper
  },
  baseQuery: function() {
    return {
      select: 'SELECT supplerendebynavn, json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef)) as postnumre, json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef)) as kommuner' +
        ' FROM supplerendebynavne' +
        ' LEFT JOIN kommuner k ON supplerendebynavne.kommunekode = k.kode' +
        ' LEFT JOIN postnumre p ON supplerendebynavne.postnr = p.nr',
      whereClauses: [],
      groupBy: 'supplerendebynavne.supplerendebynavn',
      orderClauses: [],
      sqlParams: []
    };
  }
};

var apiSpecs = {
  adresse: adresseApiSpec,
  adgangsadresse: adgangsadresseApiSpec,
  vejnavn: vejnavnApiSpec,
  postnummer: postnummerSpec,
  vejstykke: vejstykkeSpec,
  kommune: kommuneApiSpec,
  supplerendeBynavn: supplerendeBynavnApiSpec
};

_.extend(exports, apiSpecs);

exports.allSpecNames = _.keys(apiSpecs);
