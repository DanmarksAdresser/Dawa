"use strict";

const expect = require('chai').expect;
const path = require('path');
const q = require('q');

const importOisImpl = require('../../ois/importOisImpl');
const oisModels = require('../../ois/oisModels');
const testdb = require('../helpers/testdb');

const FIELDS_NOT_IN_TEST_DATA = {
  bygning: [
    "bygningsnr",
  "Byggesag_id",
  "BygStam_id",
  "UdloebDatoMidl",
  "BYG_AFLOEB_KODE",
  "BYG_AFLOEB_TILL",
  "SuppYderVaegMat",
  "SuppTagDaekMat",
  "AsbestMateriale",
  "Carport_Princip",
  "FREDNING_KODE",
  "BevarVaerdig",
  "UdlejForhold1",
  "HuslejeOplysDato",
  "SagsType",
  "BygPktNoejagtigKls",
  "BygPkt_id",
  "StormRaadPaalaegDato",
  "BygSkadeForsikSelskab",
  "BygSkadeForsikSelskabDato",
  "KomFelt1",
  "KomFelt2",
  "KomFelt3",
  "JourNr",
  "ESDH_Ref",
  "eRef",
  "Delnr",
  "Opdelingsnr",
  "BygSkadeOmfatFors",
  "Gyldighedsdato"
],

  opgang: [
  "ByggeSag_id",
    "OpgStam_id",
    "DataFelt2",
    "DataFelt3",
    "SagsType",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "ESDH_Ref",
    "Ophoert_ts",
    "Gyldighedsdato"
  ],
 enhedopgang: [
  "Ophoert_ts"
  ],
  enhed: [
  "Nybyg",
    "ByggeSag_id",
    "EnhedStam_id",
    "HenvEnh_id",
    "REF_Enhed_id",
    "IdentOpretDato",
    "ENH_UDLEJ1_KODE",
    "HuslejeOplysDato",
    "LOVLIG_ANVEND_KODE",
    "DispTidsbegraensetDato",
    "ENH_DEL_IBRUG_DATO",
    "OFF_STOETTE_KODE",
    "IndflytDato",
    "VARMEINSTAL_KODE",
    "OPVARMNING_KODE",
    "VARME_SUPPL_KODE",
    "KomFelt1",
    "KomFelt2",
    "KomFelt3",
    "JourNr",
    "ESDH_Ref",
    "Gyldighedsdato"
  ],
  tekniskanlaeg: [
  "Bygning_id",
    "FabrikatType",
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
    "ESDH_Ref",
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
  "eRef",
    "MereEnd1EjerLej",
    "EjerlejNr",
    "Ophoert_ts"
  ],
  enhedenhedsadresse: [
  "Ophoert_ts"
  ],
  bygningspunkt: []
};

describe('Import af OIS-filer', () => {
  testdb.withTransactionAll('empty', clientFn => {
    it('Kan importere et OIS-udtræk', q.async(function*() {
      yield importOisImpl.importOis(clientFn(), path.join(__dirname, 'sampleOisFiles/total'), false);
    }));
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
