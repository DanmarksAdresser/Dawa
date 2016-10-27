"use strict";

const es = require('event-stream');
const fs = require('fs');
const JSONStream = require('JSONStream');
const q = require('q');

const geojsonUtil = require('../geojsonUtil');
const importing = require('../apiSpecification/flats/importing');
const logger = require('../logger').forCategory('importBebyggelser');

function parseInteger(str) {
  if (str !== null && str !== undefined && str != '') {
    return parseInt(str, 10);
  }
  return null;
}

function verifyBebyggelser(client) {
  return q.async(function*() {
    const insertsSql = 'select bebyggelse_id, count(*) as inserts FROM insert_bebyggelser_adgadr GROUP BY bebyggelse_id';
    const deletesSql = 'select bebyggelse_id, count(*) as deletes FROM delete_bebyggelser_adgadr GROUP BY bebyggelse_id';
    const threshold = 100;
    const suspiciusBebyggelserSql = `select i.bebyggelse_id, inserts, deletes FROM (${insertsSql}) i NATURAL JOIN (${deletesSql}) d WHERE inserts >= $1 and deletes >= $1`;
    const suspiciousBebyggelser = (yield client.queryp(suspiciusBebyggelserSql, [threshold])).rows;
    if(suspiciousBebyggelser.length > 0) {
      logger.error('Mistænkelige bebyggelser. Aborterer.', { bebyggelser: suspiciousBebyggelser});
      throw new Error("Mistænkelige bebyggelser. Aborterer.");
    }
  })();
}

function importBebyggelserFromStream(client, stream, initial, skipSanityCheck) {
  const jsonTransformer = JSONStream.parse('features.*');
  const mapper = es.mapSync(geojsonFeature => {
    const properties = geojsonFeature.properties;
    return {
      id: properties.ID_LOKALID,
      kode: parseInteger(properties.BEBYGGELSESKODE),
      type: properties.BEBYGGELSESTYPE,
      navn: properties.SKRIVEMAADE,
      geom: geojsonUtil.toPostgresqlGeometry(geojsonFeature.geometry, false, true)
    };
  });
  return importing.importFlat(client, 'bebyggelse', stream, [jsonTransformer, mapper], initial, skipSanityCheck ? null  : verifyBebyggelser);
}

function importBebyggelser(client, filePath, initial, skipSanityCheck) {
  const stream = fs.createReadStream(filePath, {encoding: 'utf8'});
  return importBebyggelserFromStream(client, stream, initial, skipSanityCheck);
}

module.exports = {
  importBebyggelser,
  importBebyggelserFromStream
};
