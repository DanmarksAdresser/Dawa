"use strict";

const xml = require('xml');
const iconv = require("iconv-lite");

/**
 * Create a subset of OIS data. Supply db connection to a database with address test data.
 * The script will generate ZIP files for a test data set for all buildings and units
 * on the addresses in the test data set.
 */

const child_process = require('child_process');
const path = require('path');
const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importOisImpl = require('./importOisImpl');
const oisParser = require('./oisParser');
const fs = require('fs');
const oisModels = require('./oisModels');
const fieldParsers = require('./fieldParsers');

const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder with complete OIS files', 'string'],
  targetDir: [false, 'Folder to place the resulting test files', 'string', './test/data/ois']
};

function createRawXmlStream(entityName, dataDir) {
  const files = fs.readdirSync(dataDir);
  const fileName = importOisImpl.internal.findFileName(files, entityName);
  const model = oisModels[entityName];
  const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
  const stream = importOisImpl.internal.createUnzippedStream(path.join(dataDir, fileName), xmlFileName);
  const textStream = iconv.decodeStream('ISO-8859-1');
  return oisParser.internal.rawXmlStream(stream.pipe(textStream), model.oisTable);

}

const createFilteredOisFile = (dataDir, oisModelName, filterFn, targetDir) => {
  return q.async(function*() {
    const files = fs.readdirSync(dataDir);
    const fileName = importOisImpl.internal.findFileName(files, oisModelName);
    const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
    const oisModel = oisModels[oisModelName];
    const xmlStream = createRawXmlStream(oisModelName, dataDir);
    const elm = xml.element({});
    const outStream = xml({OIS_UDTRAEK: elm}, {
      stream: true,
      indent: '  ',
      declaration: {encoding: 'ISO-8859-1'}
    });
    elm.push({
      UDTRAEK: [
        {LOEBENUMMER: "1"},
        {DATALEVERANDOER: "OIS"},
        {AF_TABEL: oisModel.oisTable},
        {HELE_LANDET: null},
        {UDTRAEKS_DATO: "2016-12-13"}
      ]
    });
    xmlStream.on('data', oisEntity => {
      if(filterFn(oisEntity)) {
        const obj = {};
        obj[oisModel.oisTable] = Object.keys(oisEntity).map(key => {
          const obj = {};
          obj[key] = oisEntity[key];
          return obj;
        });
        elm.push(obj);
      }
    });
    xmlStream.on('end', () => {
      elm.close();
    });

    const outFileStream = fs.createWriteStream(path.join(targetDir, xmlFileName));
    outStream.pipe(iconv.encodeStream('ISO-8859-1')).pipe(outFileStream);
    yield q.Promise((resolve) => {
      outFileStream.on('finish', resolve);
    });

    const args = [ 'a',
      path.resolve(path.join(targetDir, fileName)),
      path.resolve(path.join(targetDir, xmlFileName))];
    yield q.nfcall(child_process.execFile, '7za', args);
    yield q.nfcall(fs.unlink, path.join(targetDir, xmlFileName));
  })();
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_ONLY', function (client) {
    return q.async(function*() {
      const adgAdrs = new Set(_.pluck((yield client.queryp('SELECT id FROM adgangsadresser')).rows, 'id'));
      const bygningIds = new Set();
      const enhedIds = new Set();
      const opgangIds = new Set();
      const tekniskAnlaegIds = new Set();
      const bygningspunktIds = new Set();
      const grundIds = new Set();
      const bygningFilterFn = xml =>  {
        const included = adgAdrs.has(fieldParsers.uniqueidentifier(xml.AdgAdr_id));
        if(included) {
          bygningIds.add(fieldParsers.uniqueidentifier(xml.Bygning_id));
          bygningspunktIds.add(fieldParsers.uniqueidentifier(xml.BygPkt_id))
          grundIds.add(fieldParsers.uniqueidentifier(xml.Grund_id));
        }
        return included;
      };
      yield createFilteredOisFile(options.dataDir, 'bygning', bygningFilterFn, options.targetDir);
      const opgangFilterFn = xml => {
        const included = bygningIds.has(fieldParsers.uniqueidentifier(xml.Bygning_id));
        if(included) {
          opgangIds.add(fieldParsers.uniqueidentifier(xml.Opgang_id));
          return included;
        }
      };
      yield createFilteredOisFile(options.dataDir, 'opgang', opgangFilterFn, options.targetDir);
      const enhedFilterFn = xml => {
        const included = opgangIds.has(fieldParsers.uniqueidentifier(xml.Opgang_id));
        if(included) {
          enhedIds.add(fieldParsers.uniqueidentifier(xml.Enhed_id));
        }
        return included;
      };
      yield createFilteredOisFile(options.dataDir, 'enhed', enhedFilterFn, options.targetDir);
      const tekniskanlaegFilterFn = xml => {
        const included = bygningIds.has(fieldParsers.uniqueidentifier(xml.Bygning_id));
        if(included) {
          tekniskAnlaegIds.add(fieldParsers.uniqueidentifier(xml.Tekniskanlaeg_id));
          return included;
        }
      };
      const etageFilterFn = xml =>  bygningIds.has(fieldParsers.uniqueidentifier(xml.Bygning_id));
      yield createFilteredOisFile(options.dataDir, 'etage', etageFilterFn, options.targetDir);
      yield createFilteredOisFile(options.dataDir, 'tekniskanlaeg', tekniskanlaegFilterFn, options.targetDir);

      const bygningspunktFilterFn = xml => {
        return bygningspunktIds.has(fieldParsers.uniqueidentifier(xml.BygPkt_id));
      };
      yield createFilteredOisFile(options.dataDir, 'bygningspunkt', bygningspunktFilterFn, options.targetDir);

      const ejerskabFilterFn = xml => {
        const bbrId = fieldParsers.uniqueidentifier(xml.BbrId);
        return bygningIds.has(bbrId) || tekniskAnlaegIds.has(bbrId) || enhedIds.has(bbrId);
      }
      yield createFilteredOisFile(options.dataDir, 'ejerskab', ejerskabFilterFn, options.targetDir);

      const grundFilterFn = xml => {
        return grundIds.has(fieldParsers.uniqueidentifier(xml.Grund_id));
      }
      yield createFilteredOisFile(options.dataDir, 'grund', grundFilterFn, options.targetDir);

      yield createFilteredOisFile(options.dataDir, 'matrikelreference', grundFilterFn, options.targetDir);
    })();
  }).done();
});

