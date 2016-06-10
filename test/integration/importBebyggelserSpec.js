"use strict";

const expect = require('chai').expect;
const path = require('path');
const q = require('q');

const importBebyggelserImpl = require('../../bebyggelser/importBebyggelserImpl');
const testdb = require('../helpers/testdb');

describe('Import af bebyggelser', () => {
  testdb.withTransactionAll('empty', clientFn => {
    it('Kan importere en initiel bebyggelsesfil', q.async(function*() {
      const client = clientFn();
      yield importBebyggelserImpl.importBebyggelser(
        client,
        path.join(__dirname, 'sampleBebyggelserFiles', 'initial.json'),
        'bebyggelser', true);
      const bebyggelser = (yield client.queryp('select id, geo_version, kode, navn, type, st_asgeojson(geom) as geom from bebyggelser')).rows;
      expect(bebyggelser).to.have.length(1);
      const bebyggelse = bebyggelser[0];
      expect(bebyggelse.kode).to.equal(13112);
      expect(bebyggelse.navn).to.equal('Emtekær');
      expect(bebyggelse.id).to.equal('12337669-af32-6b98-e053-d480220a5a3f');
      expect(bebyggelse.type).to.equal('by');
      expect(bebyggelse.geom).to.equal('{"type":"MultiPolygon","coordinates":[[[[556778,6134634],[556778,6134635],[556779,6134635],[556779,6134634],[556778,6134634]]]]}');
      expect(bebyggelse.geo_version).to.equal(1);
    }));

    it('Kan opdatere bebyggelse', q.async(function*() {
      const client = clientFn();
      yield importBebyggelserImpl.importBebyggelser(
        client,
        path.join(__dirname, 'sampleBebyggelserFiles', 'updated.json'),
        'bebyggelser', false);
      const bebyggelser = (yield client.queryp('select id, geo_version, kode, navn, type, st_asgeojson(geom) as geom from bebyggelser')).rows;
      expect(bebyggelser).to.have.length(1);
      const bebyggelse = bebyggelser[0];
      expect(bebyggelse.kode).to.equal(null);
      expect(bebyggelse.navn).to.equal('Updated');
      expect(bebyggelse.id).to.equal('12337669-af32-6b98-e053-d480220a5a3f');
      expect(bebyggelse.type).to.equal('bydel');
      expect(bebyggelse.geom).to.equal('{"type":"MultiPolygon","coordinates":[[[[556779,6134635],[556779,6134636],[556780,6134636],[556780,6134635],[556779,6134635]]]]}');
      expect(bebyggelse.geo_version).to.equal(2);

    }));
  });
});
