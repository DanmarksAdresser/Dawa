"use strict";

/**
 * Tests all SQL based query parameters
 */

var expect = require('chai').expect;
const { go } = require('ts-csp');
var _ = require('underscore');

var kode4String = require('../../apiSpecification/util').kode4String;
var parameterParsing = require('../../parameterParsing');
var registry = require('../../apiSpecification/registry');
var adgangsadresseParameters = require('../../apiSpecification/adgangsadresse/parameters');
var testdb = require('../helpers/testdb2');
var husnrUtil = require('../../apiSpecification/husnrUtil');
require('../../apiSpecification/allSpecs');


function multiVerifier(verifierFn) {
  return function(object, paramString) {
    var values = paramString.split('|');
    return values.some(function(value) {
      return verifierFn(object, value);
    });
  };
}

var sampleParameters = {
  bygning: {
    id: {
      values: ['1005266425'],
      verifier: (bygning, id) => bygning.id === id
    },
    bygningstype: {
      values: ["Tank/Silo"],
      verifier: (bygning, type) => bygning.bygningstype === type
    },
    metode3d: {
      values: ["Tag"],
      verifier: (bygning, metode) => bygning.metode3d === metode
    },
    målested: {
      values: ["Tag"],
      verifier: (bygning, sted) => bygning.målested === sted
    },
    bbrbygning_id: {
      values: ['3b587385-73e0-4980-b6d6-2955e421bfb3'],
      verifier: (bygning, id) => bygning.bbrbygning.id === id
    },
    kommunekode: {
      values: ['99'],
      verifier: (bygning, kommunekode) => bygning.kommuner.filter(kommune => parseInt(kommune.kode) === parseInt(kommunekode)).length === 1
    }
  },
  navngivenvej: {
    id: {
      values: ['6cb22adb-a6d6-4889-a440-4811ded6db34'],
      verifier: (vej, id) => vej.id === id
    },
    darstatus: {
      values: ['gældende'],
      verifier: (vej, darstatus) => vej.darstatus === darstatus
    },
    navn: {
      values: ["Søndre Kinkelgade"],
      verifier: (vej,navn) => vej.navn === navn
    },
    adresseringsnavn: {
      values: ['Borgm Christiansensg'],
      verifier: (vej, adresseringsnavn) => vej.adresseringsnavn === adresseringsnavn
    },
    kommunekode: {
      values: ['420', '0461'],
      verifier: (vej, kommunekode) => _.some(vej.vejstykker, vejstykke => parseInt(vejstykke.kommunekode) === parseInt(kommunekode))
    },
    administrerendekommunekode: {
      values: ['0510', '510'],
      verifier: (vej,kommunekode) => parseInt(vej.administrerendekommune.kode) ===parseInt(kommunekode)
    },
    vejstykkeid: {
      values: ['5cabd697-4eae-11e8-93fd-066cff24d637'],
      verifier: (vej,id) =>  _.some(vej.vejstykker, vejstykke => vejstykke.id === id)
    }
  },
  vejstykke: {
    kode: {
      values: ['522', '0522'],
      verifier: function(vejstykke, kode) {
        return vejstykke.kode === kode4String(kode);
      }
    },
    id: {
      values: ['5cabd697-4eae-11e8-93fd-066cff24d637'],
      verifier: (vejstykke,id) => vejstykke.id === id
    },
    navngivenvej_id: {
      values: ['67980870-86f6-4b2f-9334-c1f9b3a409de'],
      verifier: (vejstykke, navngivenvej_id) =>
        vejstykke.navngivenvej.id === navngivenvej_id
    },
    kommunekode: {
      values: ['269', '0269'],
      verifier: function(vejstykke, kommunekode) {
        return vejstykke.kommune.kode === kode4String(kommunekode);
      }
    },
    navn: {
      values: ['Strandmarken'],
      verifier: function(vejstykke, navn) {
        return vejstykke.navn === navn;
      }
    },
    postnr: {
      values: ['6100'],
      verifier: function(vejstykke, nr) {
        return _.some(vejstykke.postnumre, function(postnummer) {
          return postnummer.nr === nr;
        });
      }
    }
  },
  vejnavn: {
    navn: {
      values: ['Birkede Brovej'],
      verifier: function(vejnavn, navn) {
        return vejnavn.navn === navn;
      }
    },
    postnr: {
      values: ['6100'],
      verifier: function(vejnavn, nr) {
        return _.some(vejnavn.postnumre, function(postnummer) {
          return postnummer.nr === nr;
        });
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(vejnavn, kommunekode) {
        return _.some(vejnavn.kommuner, function(kommune) {
          return kommune.kode === kode4String(kommunekode);
        });
      }
    }
  },
  postnummer: {
    nr: {
      values: ['6100'],
      verifier: function(postnummer, nr) {
        return postnummer.nr === nr;
      }
    },
    navn: {
      values: ['Slagelse'],
      verifier: function(postnummer, navn) {
        return postnummer.navn === navn;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(postnummer, kommunekode) {
        return _.some(postnummer.kommuner, function(kommune) {
          return kommune.kode === kode4String(kommunekode);
        });
      }
    },
    stormodtagere: {
      values: ['true', 'false'],
      verifier: function(postnummer, paramVal) {
        return paramVal ? true : postnummer.stormodtageradresser === null;
      }
    }
  },
  "supplerendebynavn-old": {
    navn: {
      values: ['Skallebølle'],
      verifier: function(supplerendeBynavn, navn) {
        return supplerendeBynavn.navn === navn;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(supplerendeBynavn, kommunekode) {
        return _.some(supplerendeBynavn.kommuner, function(kommune) {
          return kommune.kode === kode4String(kommunekode);
        });
      }
    },
    postnr: {
      values: ['5200'],
      verifier: function(supplerendeBynavn, nr) {
        return _.some(supplerendeBynavn.postnumre, function(postnummer) {
          return postnummer.nr === nr;
        });
      }
    }
  },
  kommune: {
    kode: {
      values: ['461', '0461'],
      verifier: function(kommune, kode) {
        return kommune.kode === kode4String(kode);
      }
    },
    navn: {
      values: ['Aarhus'],
      verifier: function(kommune, navn) {
        return kommune.navn === navn;
      }
    },
    udenforkommuneinddeling: {
      values: ['true', 'false'],
      verifier: (kommune,udenforkommuneinddeling) => {
        return '' + kommune.udenforkommuneinddeling === udenforkommuneinddeling
      }
    },
    regionskode: {
      values: ['1084'],
      verifier: (kommune,regionskode) => {
        return regionskode === kommune.regionskode
      }
    }
  },
  adgangsadresse: {
    id: {
      values: ['0a3f507b-b8ea-32b8-e044-0003ba298018'],
      verifier: function(adr, id) {
        return adr.id === id;
      }
    },
    status: {
      values: ['1'],
      verifier: function(adr, status) {
        return adr.status === parseInt(status, 10);
      }
    },
    vejkode: {
      values: ['1010'],
      verifier: function(adr, vejkode) {
        return adr.vejstykke.kode === kode4String(vejkode);
      }
    },
    vejnavn: {
      values: ['Birkede Brovej'],
      verifier: function(adr, vejnavn) {
        return adr.vejstykke.navn === vejnavn;
      }

    },
    husnr: {
      values: ['130A'],
      verifier: function(adr, husnr) {
        return adr.husnr === husnr;
      }
    },
    husnrfra: {
      values: ['10B'],
      verifier: function(adr, husnrStr) {
        var adrHusnr = husnrUtil.parseHusnr(adr.husnr);
        var husnr = husnrUtil.parseHusnr(husnrStr);
        var result = husnrUtil.compare(adrHusnr, husnr);
        return result >= 0;
      }
    },
    husnrtil: {
      values: ['10B'],
      verifier: function(adr, husnrStr) {
        var adrHusnr = husnrUtil.parseHusnr(adr.husnr);
        var husnr = husnrUtil.parseHusnr(husnrStr);
        var result = husnrUtil.compare(adrHusnr, husnr);

        return result <= 0;
      }

    },
    supplerendebynavn: {
      values: ['Kerte'],
      verifier: function(adr, supplerendeBynavn) {
        return adr.supplerendebynavn === supplerendeBynavn;
      }
    },
    postnr: {
      values: ['4622'],
      verifier: function(adr, nr) {
        return adr.postnummer.nr === nr;
      }
    },
    nøjagtighed: {
      values: ['A'],
      verifier: function(adr, nøjagtighed) {
        return adr.adgangspunkt.nøjagtighed === nøjagtighed;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.kommune.kode === kode4String(kode);
      }
    },
    regionskode: {
      values: ['1084'],
      verifier: function(adr, kode) {
        return adr.region.kode === kode4String(kode);
      }
    },
    sognekode: {
      values: ['7210'],
      verifier: function(adr, kode) {
        return adr.sogn.kode === kode4String(kode);
      }
    },
    politikredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.politikreds.kode === kode4String(kode);
      }
    },
    retskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.retskreds.kode === kode4String(kode);
      }
    },
    opstillingskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.opstillingskreds.kode === kode4String(kode);
      }
    },
    zone: {
      values: ['Byzone'],
      verifier: function(adr, zone) {
        return adr.zone === zone;
      }
    },
    zonekode: {
      values: ['1'],
      verifier: function(adr) {
        return adr.zone === 'Byzone';
      }
    },
    ejerlavkode: {
      values: ['60851', '060851'],
      verifier: function(adr, ejerlavkode) {
        return adr.jordstykke && adr.jordstykke.ejerlav.kode === parseInt(ejerlavkode, 10);
      }
    },
    matrikelnr: {
      values: ['1a'],
      verifier: function(adr, matrikelnr) {
        return adr.jordstykke && adr.jordstykke.matrikelnr === matrikelnr;
      }
    },
    stednavnid: {
      // note, verification only works for bebyggelser
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: (adr, stednavnid) => adr.bebyggelser.filter(bebyggelse => bebyggelse.id === stednavnid).length === 1
    },
    stedid: {
      // note, verification only works for bebyggelser
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: (adr, stedid) => adr.bebyggelser.filter(bebyggelse => bebyggelse.id === stedid).length === 1
    },
    bebyggelsesid: {
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: function(adr, bebyggelsesid) {
        return adr.bebyggelser.filter(bebyggelse => bebyggelse.id === bebyggelsesid).length === 1;
      }
    },
    bebyggelsestype: {
      values: ['by'],
      verifier: function(adr, type) {
        return adr.bebyggelser.filter(bebyggelse => bebyggelse.type === type).length >= 1;
      }
    }
  },
  adresse: {
    id: {
      values: ['07839141-fca3-49ef-8747-2e9a5551dd6d'],
      verifier: function(adr, id) {
        return adr.id === id;
      }
    },
    status: {
      values: ['1'],
      verifier: function(adr, status) {
        return adr.status === parseInt(status, 10);
      }
    },
    etage: {
      values: ['kl', '1', '', 'st|'],
      verifier: multiVerifier(function(adr, etage) {
        if (etage === '') {
          return adr.etage === null;
        }

        return adr.etage === etage;
      })
    },
    dør: {
      values: ['tv', '1'],
      verifier: function(adr, dør) {
        return adr.dør === dør;
      }
    },
    adgangsadresseid: {
      values: ['0a3f507b-b8f0-32b8-e044-0003ba298018'],
      verifier: function(adr, id) {
        return adr.adgangsadresse.id === id;
      }
    },
    vejkode: {
      values: ['1010'],
      verifier: function(adr, vejkode) {
        return adr.adgangsadresse.vejstykke.kode === kode4String(vejkode);
      }
    },
    vejnavn: {
      values: ['Birkede Brovej'],
      verifier: function(adr, vejnavn) {
        return adr.adgangsadresse.vejstykke.navn === vejnavn;
      }

    },
    husnr: {
      values: ['130A'],
      verifier: function(adr, husnr) {
        return adr.adgangsadresse.husnr === husnr;
      }
    },
    husnrfra: {
      values: ['10B'],
      verifier: function(adr, husnrStr) {
        var adrHusnr = husnrUtil.parseHusnr(adr.adgangsadresse.husnr);
        var husnr = husnrUtil.parseHusnr(husnrStr);
        var result = husnrUtil.compare(adrHusnr, husnr);
        return result >= 0;
      }
    },
    husnrtil: {
      values: ['10B'],
      verifier: function(adr, husnrStr) {
        var adrHusnr = husnrUtil.parseHusnr(adr.adgangsadresse.husnr);
        var husnr = husnrUtil.parseHusnr(husnrStr);
        var result = husnrUtil.compare(adrHusnr, husnr);

        return result <= 0;
      }

    },
    supplerendebynavn: {
      values: ['Kerte'],
      verifier: function(adr, supplerendeBynavn) {
        return adr.adgangsadresse.supplerendebynavn === supplerendeBynavn;
      }
    },
    postnr: {
      values: ['4622'],
      verifier: function(adr, nr) {
        return adr.adgangsadresse.postnummer.nr === nr;
      }
    },
    nøjagtighed: {
      values: ['A'],
      verifier: function(adr, nøjagtighed) {
        return adr.adgangsadresse.adgangspunkt.nøjagtighed === nøjagtighed;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.kommune.kode === kode4String(kode);
      }
    },
    regionskode: {
      values: ['1084'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.region.kode === kode4String(kode);
      }
    },
    sognekode: {
      values: ['7210'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.sogn.kode === kode4String(kode);
      }
    },
    politikredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.politikreds.kode === kode4String(kode);
      }
    },
    retskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.retskreds.kode === kode4String(kode);
      }
    },
    opstillingskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.opstillingskreds.kode === kode4String(kode);
      }
    },
    zone: {
      values: ['Byzone'],
      verifier: function(adr, zone) {
        return adr.adgangsadresse.zone === zone;
      }
    },
    zonekode: {
      values: ['1'],
      verifier: function(adr) {
        return adr.adgangsadresse.zone === 'Byzone';
      }
    },
    ejerlavkode: {
      values: ['60851', '060851'],
      verifier: function(adr, ejerlavkode) {
        return adr.adgangsadresse.jordstykke &&
          adr.adgangsadresse.jordstykke.ejerlav.kode === parseInt(ejerlavkode, 10);
      }
    },
    matrikelnr: {
      values: ['1a'],
      verifier: function(adr, matrikelnr) {
        return adr.adgangsadresse.jordstykke && adr.adgangsadresse.jordstykke.matrikelnr === matrikelnr;
      }
    },
    stednavnid: {
      // note, verification only works for bebyggelser
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: (adr, stednavnid) => adr.adgangsadresse.bebyggelser.filter(bebyggelse => bebyggelse.id === stednavnid).length === 1
    },
    stedid: {
      // note, verification only works for bebyggelser
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: (adr, stedid) => adr.adgangsadresse.bebyggelser.filter(bebyggelse => bebyggelse.id === stedid).length === 1
    },
    bebyggelsesid: {
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: function(adr, bebyggelsesid) {
        return adr.adgangsadresse.bebyggelser.filter(bebyggelse => bebyggelse.id === bebyggelsesid).length === 1;
      }
    },
    bebyggelsestype: {
      values: ['by'],
      verifier: function(adr, type) {
        return adr.adgangsadresse.bebyggelser.filter(bebyggelse => bebyggelse.type === type).length >= 1;
      }
    }
  },
  adresse_history: {
    id: {
      values: ['f481e7d5-989e-4372-86a2-58e72cf64e44'],
      verifier: (adr, id) => adr.id === id
    },
    postnr: {
      values: ['2300'],
      verifier: (adr, postnr) => adr.postnr === postnr
    },
    kommunekode: {
      values: ['101', '0101'],
      verifier: (adr, kode) => parseInt(adr.kommunekode) === parseInt(kode)
    },
    adgangsadresseid: {
      values: ['04b3fd1d-48f0-4f80-89df-88b322a84f23'],
      verifier: (adr, id)=> adr.adgangsadresseid === id
    }
  },
  adgangsadresse_history: {
    id: {
      values: ['04b3fd1d-48f0-4f80-89df-88b322a84f23'],
      verifier: (adr, id) => {
        return adr.id === id;
      }
    },
    postnr: {
      values: ['2300'],
      verifier: (adr, postnr) => adr.postnr === postnr
    },
    kommunekode: {
      values: ['101', '0101'],
      verifier: (adr, kode) => parseInt(adr.kommunekode) === parseInt(kode)
    }
  },
  bebyggelse: {
    id: {
      values: ['12337669-a188-6b98-e053-d480220a5a3f'],
      verifier: (bebyggelse, id) => bebyggelse.id === id
    },
    navn: {
      values: ['Aarhus'],
      verifier: (bebyggelse, navn) => bebyggelse.navn === navn
    },
    type: {
      values: ['by'],
      verifier: (bebyggelse, type) => bebyggelse.type === type
    }
  },
  jordstykke: {
    ejerlavkode: {
      values: ['60851', '060851'],
      verifier: (jordstykke, ejerlavkode) => jordstykke.ejerlav.kode === parseInt(ejerlavkode, 10)
    },
    matrikelnr: {
      values: ['1a'],
      verifier: (jordstykke, matrikelnr) => jordstykke.matrikelnr === matrikelnr
    },
    esrejendomsnr: {
      values: ['8571' ,'08571'],
      verifier: (jordstykke, esrejendomsnr) => jordstykke.esrejendomsnr === parseInt(esrejendomsnr, 10).toString()
    },
    udvidet_esrejendomsnr: {
      values: ['3500009633'],
      verifier: (jordstykke, esrejendomsnr) => jordstykke.udvidet_esrejendomsnr === parseInt(esrejendomsnr, 10).toString()
    },
    sfeejendomsnr: {
      values: ['1305735'],
      verifier: (jordstykke, sfeejendomsnr) => jordstykke.sfeejendomsnr === sfeejendomsnr
    },
    kommunekode: {
      values: ['0350', '350'],
      verifier: (jordstykke, kommunekode) => parseInt(jordstykke.kommune.kode, 10) === parseInt(kommunekode, 10)
    },
    regionskode: {
      values: ['1085'],
      verifier: (jordstykke, regionskode) => jordstykke.region.kode === regionskode
    },
    sognekode: {
      values: ['7171'],
      verifier: (jordstykke, sognekode) => jordstykke.sogn.kode === sognekode
    },
    retskredskode: {
      values: ['1180'],
      verifier: (jordstykke, retskredskode) => jordstykke.retskreds.kode === retskredskode
    }
  },
  "sted": {
    id: {
      values: ['12337669-8e23-6b98-e053-d480220a5a3f'],
      verifier: (sted, id) => sted.id === id
    },
    hovedtype: {
      values: ['Bygning'],
      verifier: (sted, hovedtype) => sted.hovedtype === hovedtype
    },
    undertype: {
      values: ['hal'],
      verifier: (sted, undertype) => sted.undertype === undertype
    },
    kommunekode: {
      values: ['99'],
      verifier: (sted, kommunekode) => parseInt(sted.kommuner[0].kode, 10) === parseInt(kommunekode, 10)
    },
    primærtnavn: {
      values: ["Aarhus"],
      verifier: (sted, primærtnavn) => sted.primærtnavn === primærtnavn
    },
    primærnavnestatus: {
      values: ['officielt'],
      verifier: (sted, primærnavnestatus) => sted.primærnavnestatus === primærnavnestatus
    }
  },
  "stednavn": {
      sted_id: {
        values: ['12337669-8e23-6b98-e053-d480220a5a3f'],
        verifier: (stednavn, id) => stednavn.sted.id === id
      },
      navn: {
        values: ['Humlehavehallen'],
        verifier: (stednavn, navn)  => stednavn.navn === navn
      },
      hovedtype: {
        values: ['Bygning'],
        verifier: (stednavn, hovedtype) => stednavn.sted.hovedtype === hovedtype
      },
      undertype: {
        values: ['hal'],
        verifier: (stednavn, undertype) => stednavn.sted.undertype === undertype
      },
      kommunekode: {
        values: ['99'],
        verifier: (stednavn, kommunekode) => parseInt(stednavn.sted.kommuner[0].kode, 10) === parseInt(kommunekode, 10)
      },
      navnestatus: {
        values: ['officielt', 'suAutoriseret'],
        verifier: (stednavn, status) => stednavn.navnestatus === status
      },
    brugsprioritet: {
        values: ['primær', 'sekundær'],
      verifier: (stednavn, brugsprioritet) => stednavn.brugsprioritet === brugsprioritet
    }
  },
  "stednavn-legacy": {
    id: {
      values: ['12337669-8e23-6b98-e053-d480220a5a3f'],
      verifier: (stednavn, id) => stednavn.id === id
    },
    navn: {
      values: ['Humlehavehallen'],
      verifier: (stednavn, navn)  => stednavn.navn === navn
    },
    hovedtype: {
      values: ['Bygning'],
      verifier: (stednavn, hovedtype) => stednavn.hovedtype === hovedtype
    },
    undertype: {
      values: ['hal'],
      verifier: (stednavn, undertype) => stednavn.undertype === undertype
    },
    kommunekode: {
      values: ['99'],
      verifier: (stednavn, kommunekode) => parseInt(stednavn.kommuner[0].kode, 10) === parseInt(kommunekode, 10)
    },
    navnestatus: {
      values: ['officielt', 'suAutoriseret'],
      verifier: (stednavn, status) => stednavn.navnestatus === status
    }
  },
  ois_grund_full: {
    id: {
      values: ['003b8b83-a7da-4cd1-9ebf-9d2ed4b2d522'],
      verifier: (grund, id) => grund.Grund_id === id
    },
    adgangsadresseid: {
      values: ['0a3f507e-0409-32b8-e044-0003ba298018'],
      verifier: (grund, id) => grund.AdgAdr_id === id
    },
    kommuneid: {
      values: ['07c7b9a2-7320-436a-bf28-33883768e7e4'],
      verifier: (grund, kommuneid) => grund.Kommune_id === kommuneid
    },
    esrejendomsnr: {
      values: ['2632', '002632'],
      verifier: (grund, nr) =>   parseInt(grund.ESREjdNr, 10) === parseInt(nr, 10)
    },
    sfeejendomsnr: {
      values: ['2695110', '02695110'],
      verifier: (grund, sfeejendomsnr) => parseInt(grund.MatrSFE_id, 10) === parseInt(sfeejendomsnr, 10)
    }
  },
  ois_bygning_full: {
    id: {
      values: ['00058c31-60c7-45d5-9b80-a031270c0034'],
      verifier: (bygning, id) => bygning.Bygning_id === id
    },
    adgangsadresseid: {
      values: ['0a3f507e-0409-32b8-e044-0003ba298018'],
      verifier: (bygning, id) => bygning.AdgAdr_id === id
    },
    esrejendomsnr: {
      values: ['095967', '95967'],
      verifier: (bygning, nr) =>   parseInt(bygning.ESREjdNr, 10) === parseInt(nr, 10)
    },
    anvendelseskode: {
      values: ['120'],
      verifier: (bygning, kode) => bygning.BYG_ANVEND_KODE === parseInt(kode, 10)
    },
    kommunekode: {
      values: ['0265'],
      verifier: (bygning, kode) => bygning.KomKode === kode
    }
  },
  ois_tekniskanlaeg_full: {
    id: {
      values: ['ff1b4aef-ef89-4822-bbf0-1fadeec2d38c'],
      verifier: (anlaeg, id) => anlaeg.Tekniskanlaeg_id === id
    },
    adgangsadresseid: {
      values: ['0a3f507b-c8ff-32b8-e044-0003ba298018'],
      verifier: (anlaeg, adgangsadresseid) => anlaeg.AdgAdr_id === adgangsadresseid
    },
    esrejendomsnr: {
      values: ['061537', '61537'],
      verifier: (anlaeg, nr) => parseInt(anlaeg.ESREjdNr, 10) === parseInt(nr, 10)
    },
    bygningsid: {
      values: ['d284b19e-b68a-4d1b-ac17-5576c3750231'],
      verifier: (anlaeg, id) => anlaeg.Bygning_id === id
    },
    kommunekode: {
      values: ['0253', '253'],
      verifier: (anlaeg, kode) => parseInt(anlaeg.KomKode, 10) === parseInt(kode, 10)
    },
    klassifikation: {
      values: ['1920'],
      verifier: (anlaeg, klassifikation) => anlaeg.Klassifikation === parseInt(klassifikation, 10)
    }
  },
  ois_opgang_full: {
    id: {
      values: ['008ff3ab-db75-4755-a71b-470f7eb42483'],
      verifier: (opgang, id) => opgang.Opgang_id === id
    },
    bygningsid: {
      values: ['affbb717-e4c0-489a-962c-5cc5505248b3'],
      verifier: (opgang, bygningsid) => opgang.Bygning_id === bygningsid
    },
    adgangsadresseid: {
      values: ['0a3f507e-0409-32b8-e044-0003ba298018'],
      verifier: (opgang, adgangsadresseid) => opgang.AdgAdr_id === adgangsadresseid
    }
  },
  ois_enhed_full: {
    id: {
      values: ['00006909-250f-4878-8117-663b759bcac1'],
      verifier: (enhed, id) => enhed.Enhed_id === id
    },
    adresseid: {
      values: ['0a3f50aa-dfa0-32b8-e044-0003ba298018'],
      verifier: (enhed, id) => enhed.EnhAdr_id === id
    },
    anvendelseskode: {
      values: ['140'],
      verifier: (enhed, kode) => enhed.ENH_ANVEND_KODE === parseInt(kode, 10)
    },
    bygningsid: {
      values: ['701c5259-82bc-4f69-8f98-8d319dc0b381'],
      verifier: (enhed, id) => enhed.bygning.Bygning_id === id
    },
    kommunekode: {
      values: ['0461'],
      verifier: (enhed, kode) => enhed.bygning.KomKode === kode
    }
  },
  ois_etage_full: {
    id: {
      values: ['0012cdf2-5cd8-4e81-869f-54955973a58d'],
      verifier: (etage, id) => etage.Etage_id === id
    },
    bygningsid: {
      values: ['6c6ea386-df09-42c4-b610-64e3b311896e'],
      verifier: (etage, bygningsid) => etage.Bygning_id === bygningsid
    }
  },
  ois_ejerskab_full: {
    id: {
      values: ['00db6657-2d66-4b49-949d-ce9e31d7b823'],
      verifier: (ejerskab, id) => ejerskab.Ejerskab_id === id
    },
    bbrid: {
      values: ['40e0ec3f-419b-4c92-8f0c-f8b6f5184604'],
      verifier: (ejerskab, bbrid) => ejerskab.BbrId === bbrid
    },
    kommunekode: {
      values: ['0461', '461'],
      verifier: (ejerskab, kode) => parseInt(ejerskab.kommune.KomKode, 10) === parseInt(kode, 10)
    },
    esrejendomsnr: {
      values: ['704986'],
      verifier: (bygning, nr) =>   parseInt(bygning.ESREjdNr, 10) === parseInt(nr, 10)
    }
  },
  ois_kommune_full: {
    id: {
      values: ['09c46ce8-36ea-498d-aa36-cd3d06f1aac3'],
      verifier: (kommune, id)=> kommune.Kommune_id === id
    },
    kommunekode: {
      values: ['0671', '671'],
      verifier: (kommune, kode) => parseInt(kommune.KomKode, 10) === parseInt(kode, 10)
    }
  },
  ois_bygningspunkt_full: {
    id: {
      values: ['001b754d-9fcb-4b65-8e79-d81fe98f0367'],
      verifier: (bygningspunkt, id) => bygningspunkt.BygPkt_id === id
    }
  },
  ois_matrikelreference_full: {
    grundid: {
      values: ['7992a022-b023-48db-9705-9a90aa1c0108'],
      verifier: (matref, id) => matref.Grund_id === id
    },
    ejerlavkode: {
      values: ['390954'],
      verifier: (matref, kode) => matref.LandsejerlavKode === parseInt(kode, 10)
    },
    matrikelnr: {
      values: ['5f'],
      verifier: (matref, nr) => matref.MatrNr === nr
    }
  },
  stednavntype: {
    hovedtype: {
      values: ['Bebyggelse'],
      verifier: (t, hovedtype) => t.hovedtype === hovedtype
    }
  }
};

var additionalParameters = {
  adgangsadresse: adgangsadresseParameters.husnrinterval,
  adresse: adgangsadresseParameters.husnrinterval
};

_.keys(sampleParameters).forEach(function(specName) {
  var propertyFilterParameters = registry.findWhere({
    entityName: specName,
    type: 'parameterGroup',
    qualifier: 'propertyFilter'
  });

  var jsonRepresentation = registry.findWhere({
    entityName: specName,
    type: 'representation',
    qualifier: 'json'
  });
  var sqlModel = registry.findWhere({
    entityName: specName,
    type: 'sqlModel'
  });

  var untestedParams = {
    adgangsadresse: ['esrejendomsnr'],
    adresse: ['esrejendomsnr']
  };
  var allParameters = propertyFilterParameters.concat(additionalParameters[specName] || []);
  describe('Query for ' + specName, function() {
    it('tester alle parametre', function() {
      var specifiedParameterNames = _.pluck(allParameters, 'name');
      var testedParameterNames = _.keys(sampleParameters[specName]);
      expect(_.difference(specifiedParameterNames, testedParameterNames)).to.deep.equal(untestedParams[specName] || []);
    });
    describe('Parametre for ' + specName, function() {
      _.each(sampleParameters[specName], function(sample, paramName) {
        var verify = sample.verifier;
        sample.values.forEach(function(sampleValue) {
          describe('case ' + paramName + '=' + sampleValue, function() {
            it('Query for ' + specName + ' case ' + paramName + '=' + sampleValue + ' skal returnere korrekt resultat', function() {
              var parseResult;
              var rawQueryParams = {};
              rawQueryParams[paramName] = sampleValue;
              parseResult = parameterParsing.parseParameters(rawQueryParams, _.indexBy(allParameters, 'name'));
              expect(parseResult.errors).to.deep.equal([]);
              parseResult.params.per_side = 100;
              return testdb.withTransaction('test', 'READ_ONLY', function(client) {
                return go(function*() {
                  const rows = yield sqlModel.processQuery(
                    client,
                    _.pluck(jsonRepresentation.fields, 'name'),
                    parseResult.params);
                  expect(rows.length).to.be.above(0);
                  var mappedRows = _.map(rows, jsonRepresentation.mapper("BASE_URL", parseResult.params));
                  mappedRows.forEach(function(json) {
                    var verifyResult = verify(json, sampleValue);
                    expect(verifyResult).to.equal(true);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
