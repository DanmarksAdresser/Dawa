"use strict";

const expect = require('chai').expect;
const q = require('q');

const oisModels = require('../../ois/oisModels');
const testdb = require('../helpers/testdb2');
const importOisImpl = require('../../ois/importOisImpl');

const FIELDS_NOT_IN_TEST_DATA = {
  grund: [
    "Byggesag_id",
    "GrundStam_id",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "ESDH_Ref",
    "Gyldighedsdato",
    "GruMdlSplvnd",
    "GruPbFrbRens",
    "GruPbFrbRensDato",
    "GruTilUdtr",
    "GruTilUdtrDato",
    "GruTilAltAfld",
    "GruTilAltAfldDato"
  ],
  bygning: [
    "BevarVaerdig",
    "UdlejForhold1",
    "HuslejeOplysDato",
    "StormRaadPaalaegDato",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "eRef",
    "Opdelingsnr"
  ],
  opgang: [
    "DataFelt2",
    "DataFelt3",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "ESDH_Ref"
  ],
  enhedopgang: [
    "ois_id",
    "ois_ts",
    "EnhedOpgang_id",
    "Opgang_id",
    "Enhed_id",
    "PrimaerIndg",
    "OPRET_TS",
    "AENDR_TS",
    "Aendr_Funk",
    "Ophoert_ts"
  ],
  enhed: [
    "Nybyg",
    "REF_Enhed_id",
    "ENH_UDLEJ1_KODE",
    "HuslejeOplysDato",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "ESDH_Ref"
  ],
  etage: [
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "ESDH_Ref"
  ],
  tekniskanlaeg: [
    "ExtDB",
    "ExtNoegle",
    "Slojfning",
    "FabrikatNr",
    "TypegodkNr",
    "SloejfFristDato",
    "FredningsStatus",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "eRef",
    "Delnr",
    "Opdelingsnr",
    "Materiale",
    "InvendigBeskyt",
    "InvendigBeskytDato",
    "CETypegodk",
    "Gyldighedsdato",
    "SloejfningAar"
  ],
  ejerskab: [
    "eRef"
  ],
  kommune: [
    "Ophoert_ts"
  ],
  enhedenhedsadresse: [
    "ois_id",
    "ois_ts",
    "EnhEnhAdr_id",
    "EnhAdr_id",
    "Enhed_id",
    "PrimaerAdr",
    "OPRET_TS",
    "AENDR_TS",
    "Aendr_Funk",
    "Ophoert_ts"
  ],
  entitet: [],
  felt: [],
  datatype: [
    "Ophoert_ts"
  ],
  kodetype: [
    "Ophoert_ts"
  ],
  kodefelt: [
    "Ophoert_ts"
  ],
  kode: [
    "Ophoert_ts"
  ],
  bygningspunkt: [],
  matrikelreference: [
    "eRef"
  ]
};

describe('Import af OIS-filer', () => {
  testdb.withTransactionEach('test', clientFn => {
    it('Kan importere deltaudtræk', q.async(function*() {
      yield importOisImpl.importOis(clientFn(), 'test/data/ois/delta');
      const imported = (yield clientFn().queryp('SELECT COUNT(*)::integer as c FROM ois_importlog where serial = 2')).rows[0].c;
      expect(imported).to.equal(15);
    })).timeout(40000);
    it('Fejler ved manglende serienummer', q.async(function*() {
      let failed = false;
      try {
        yield importOisImpl.importOis(clientFn(), 'test/data/ois/missing-serial');
      }
      catch(e) {
        failed = true;
      }
      expect(failed).to.be.true;
    }));
  });
  testdb.withTransactionAll('test', clientFn => {
    for(let oisModelName of Object.keys(oisModels)) {
      it(`Alle felter i ${oisModelName} er blevet importeret`, q.async(function*() {
        const oisModel = oisModels[oisModelName];
        const selectList = oisModel.fields.map(field => {
          return `${field.name} as "${field.name}"`
        }).join(', ');
        const result = (yield clientFn().queryp(`select ${selectList} FROM ois_${oisModelName}`)).rows;
        const fieldsSeenMap = oisModel.fields.reduce((memo, field) => {
          memo[field.name] = false;
          return memo;
        }, {});
        for(let row of result) {
          for(let field of oisModel.fields) {
            if(row[field.name] !== null && typeof row[field.name] !== 'undefined') {
              fieldsSeenMap[field.name] = true;
            }
          }
        }
        const unseenFields = Object.keys(fieldsSeenMap).filter(fieldName => !fieldsSeenMap[fieldName]);
        expect(unseenFields).to.deep.equal(FIELDS_NOT_IN_TEST_DATA[oisModelName]);
      }));
    }

  });
});
