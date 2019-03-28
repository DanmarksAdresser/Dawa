const Promise = require('bluebird');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('../psql/proddb');
const { go } = require('ts-csp');
const JSONStream = require('JSONStream');
const fs = require('fs');

const schema = {
  database_url: {
    doc: 'URL to populated test database',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  vejmidter: {
    doc: 'Input file with all road centers',
    format: 'string',
    default: null,
    required: true,
    cli: true
  },
  output: {
    doc: 'Output file with filtered road centers',
    format: 'string',
    default: null,
    required: true,
    cli: true
  }
};

const readGeojsonCollection = (filePath, filter) => go(function*() {
  const src = fs.createReadStream(filePath, {encoding: 'utf8'});
  const jsonTransformer = JSONStream.parse('features.*');
  const result = [];
  src.pipe(jsonTransformer);
  jsonTransformer.on('data', obj => {
    if(filter(obj)) {
      result.push(obj);
    }
  });
  yield new Promise((resolve, reject) => {
    jsonTransformer.on('end', resolve);
    jsonTransformer.on('error', reject);
  });
  return result;
});

const writeGeojsonCollection = (filePath, name, array) => {
  const out = fs.createWriteStream(filePath, {encoding: 'utf-8'});
  out.write(`{
        "type" : "FeatureCollection",
        "name" : "${name}",
        "crs" : {
                "type" : "name",
                "properties" : {
                        "name" : "EPSG:25832"
                }
        },
        "features" : [`);
  out.write(array.map(JSON.stringify).join(',\n'));
  out.end(']}');
};

runConfigured(schema, [], config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  const rows = yield proddb.withTransaction('READ_ONLY',
      client =>
        client.queryRows('SELECT kommunekode, kode as vejkode FROM navngivenvejkommunedel_mat'));
  const map = new Map();
  for(let row of rows) {
    if(!map.has(row.kommunekode)) {
      map.set(row.kommunekode, new Set());
    }
    map.get(row.kommunekode).add(row.vejkode);
  }
  const vejmidter = yield readGeojsonCollection(config.get('vejmidter'), vejmidte => {
    const kommunekode = parseInt(vejmidte.properties.KOMMUNEKODE);
    const vejkode = parseInt(vejmidte.properties.VEJKODE);
    return map.has(kommunekode) &&
      map.get(kommunekode).has(vejkode)
  });
  writeGeojsonCollection(config.get('output'), "VejmidtBrudt", vejmidter);
}));