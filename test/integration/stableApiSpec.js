"use strict";

const {assert, expect} = require('chai');
const q = require('q');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('../helpers/testdb2');

require('../../apiSpecification/allSpecs');

// These tests are expected to fail whenever the API is changed or extended
describe('Stable API', () => {
  const expectedResults = {
    afstemningsområde: {
      json: {
        nestet: [{
          params: {
            dagi_id: '101000'
          },
          value: {
            "href": "http://dawa/afstemningsomraader/99/2",
            "dagi_id": "101000",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1,
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "nummer": "2",
            "navn": "Test afstemningsområde",
            "afstemningssted": {
              "navn": "Test afstemningsstednavn",
              "adgangsadresse": {
                "href": "http://dawa/adgangsadresser/0a3f5089-86cc-32b8-e044-0003ba298018",
                "id": "0a3f5089-86cc-32b8-e044-0003ba298018",
                "adressebetegnelse": "Møllemarksvej 27C, Bolbro, 5200 Odense V"
              }
            },
            "kommune": {
              "href": "http://dawa/kommuner/99",
              "kode": "0099",
              "navn": "Kommune test"
            },
            "region": {
              "href": "http://dawa/regioner/1084",
              "kode": "1084",
              "navn": "Region test"
            },
            "opstillingskreds": {
              "href": "http://dawa/opstillingskredse/99",
              "nummer": "99",
              "navn": "Opstillingskreds test"
            },
            "storkreds": {
              "href": "http://dawa/storkredse/1",
              "nummer": "1",
              "navn": "Storkreds test"
            },
            "valglandsdel": {
              "href": "http://dawa/valglandsdele/A",
              "bogstav": "A",
              "navn": "Valglandsdel test"
            }
          }
        }],
        flad: [{
          params: {
            dagi_id: '101000'
          },
          value: {
            "dagi_id": "101000",
            "nummer": "2",
            "navn": "Test afstemningsområde",
            "afstemningsstednavn": "Test afstemningsstednavn",
            "afstemningsstedadresseid": "0a3f5089-86cc-32b8-e044-0003ba298018",
            "afstemningsstedadressebetegnelse": "Møllemarksvej 27C, Bolbro, 5200 Odense V",
            "kommunekode": "0099",
            "kommunenavn": "Kommune test",
            "regionskode": "1084",
            "regionsnavn": "Region test",
            "opstillingskredsnummer": "99",
            "opstillingskredsnavn": "Opstillingskreds test",
            "storkredsnummer": "1",
            "storkredsnavn": "Storkreds test",
            "valglandsdelsbogstav": "A",
            "valglandsdelsnavn": "Valglandsdel test",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1
          }
        }]
      }
    },
    opstillingskreds: {
      json: {
        nestet: [{
          params: {
            nummer: '99'
          },
          value: {
            "href": "http://dawa/opstillingskredse/99",
            "dagi_id": "100104",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1,
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "nummer": "99",
            "kode": "0099",
            "navn": "Opstillingskreds test",
            "kredskommune": {
              "href": "http://dawa/kommuner/99",
              "kode": "0099",
              "navn": "Kommune test"
            },
            "region": {
              "href": "http://dawa/regioner/1084",
              "kode": "1084",
              "navn": "Region test"
            },
            "storkreds": {
              "href": "http://dawa/storkredse/1",
              "nummer": "1",
              "navn": "Storkreds test"
            },
            "valglandsdel": {
              "href": "http://dawa/valglandsdele/A",
              "bogstav": "A",
              "navn": "Valglandsdel test"
            },
            "kommuner": [
              {
                "href": "http://dawa/kommuner/0099",
                "kode": "0099",
                "navn": "Kommune test"
              }
            ]
          }
        }],
        flad: [{
          params: {
            nummer: '99'
          },
          value: {
            "dagi_id": "100104",
            "nummer": "99",
            "kode": "0099",
            "navn": "Opstillingskreds test",
            "regionskode": "1084",
            "regionsnavn": "Region test",
            "kredskommunekode": "0099",
            "kredskommunenavn": "Kommune test",
            "storkredsnummer": "1",
            "storkredsnavn": "Storkreds test",
            "valglandsdelsbogstav": "A",
            "valglandsdelsnavn": "Valglandsdel test",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1
          }
        }]
      }
    },
    storkreds: {
      json: {
        nestet: [{
          params: {
            nummer: '1'
          },
          value: {
            "href": "http://dawa/storkredse/1",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1,
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "nummer": "1",
            "navn": "Storkreds test",
            "region": {
              "href": "http://dawa/regioner/1084",
              "kode": "1084",
              "navn": "Region test"
            },
            "valglandsdel": {
              "href": "http://dawa/valglandsdele/A",
              "bogstav": "A",
              "navn": "Valglandsdel test"
            }
          }
        }],
        flad: [{
          params: {
            nummer: '1'
          },
          value: {
            "nummer": "1",
            "navn": "Storkreds test",
            "regionskode": "1084",
            "regionsnavn": "Region test",
            "valglandsdelsbogstav": "A",
            "valglandsdelsnavn": "Valglandsdel test",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1
          }
        }]
      }
    },
    valglandsdel: {
      json: {
        nestet: [{
          params: {
            bogstav: 'A'
          },
          value: {
            "bogstav": "A",
            "navn": "Valglandsdel test",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1,
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "href": "http://dawa/valglandsdele/A"
          }

        }],
        flad: [{
          params: {
            bogstav: 'A'
          },
          value: {
            "bogstav": "A",
            "navn": "Valglandsdel test",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1,
            "geo_ændret": "2018-05-02T06:50:28.217Z",
          }
        }]
      }
    },
    supplerendebynavn: {
      json: {
        nestet: [{
          params: {
            dagi_id: "100116"
          },
          value: {
            "href": "http://dawa/supplerendebynavne/100116",
            "dagi_id": "100116",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1,
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "navn": "Supplerende bynavn test",
            "kommune": {
              "href": "http://dawa/kommuner/101",
              "kode": "0101",
              "navn": "København"
            }
          }
        }],
        flad: [{
          params: {
            dagi_id: "100116"
          },
          value: {
            "dagi_id": "100116",
            "navn": "Supplerende bynavn test",
            "kommunekode": "0101",
            "kommunenavn": "København",
            "ændret": "2018-05-02T06:50:28.217Z",
            "geo_ændret": "2018-05-02T06:50:28.217Z",
            "geo_version": 1
          }
        }]
      }
    },
    adgangsadresse: {
      json: {
        mini: [{
          params: {
            id: '0a3f5089-0408-32b8-e044-0003ba298018'
          },
          value: {
            "id": "0a3f5089-0408-32b8-e044-0003ba298018",
            "status": 1,
            "vejkode": "0855",
            "vejnavn": "Brammingevej",
            "adresseringsvejnavn": "Brammingevej",
            "husnr": "18",
            "supplerendebynavn": "Bolbro",
            "postnr": "5200",
            "postnrnavn": "Odense V",
            "kommunekode": "0461",
            "x": 10.3314668,
            "y": 55.3948974
          }
        }],
        nestet: [{
          params: {
            id: '0a3f5089-0408-32b8-e044-0003ba298018'
          },
          value: {
            "href": "http://dawa/adgangsadresser/0a3f5089-0408-32b8-e044-0003ba298018",
            "id": "0a3f5089-0408-32b8-e044-0003ba298018",
            "kvh": "04610855__18",
            "status": 1,
            "vejstykke": {
              "href": "http://dawa/vejstykker/461/855",
              "navn": "Brammingevej",
              "adresseringsnavn": "Brammingevej",
              "kode": "0855"
            },
            "husnr": "18",
            "supplerendebynavn": "Bolbro",
            "postnummer": {
              "href": "http://dawa/postnumre/5200",
              "nr": "5200",
              "navn": "Odense V"
            },
            "stormodtagerpostnummer": null,
            "kommune": {
              "href": "http://dawa/kommuner/0461",
              "kode": "0461",
              "navn": "Odense"
            },
            "ejerlav": null,
            "esrejendomsnr": null,
            "matrikelnr": null,
            "historik": {
              "oprettet": "2000-02-05T06:08:50.000",
              "ændret": "2012-01-17T21:00:12.943"
            },
            "adgangspunkt": {
              "id": "0a3f5089-0408-32b8-e044-0003ba298018",
              "koordinater": [
                10.3314668,
                55.3948974
              ],
              "højde": 31.3,
              "nøjagtighed": "A",
              "kilde": 5,
              "tekniskstandard": "TN",
              "tekstretning": 196,
              "ændret": "2009-02-11T23:59:00.000"
            },
            vejpunkt: {
              "id": "39a03418-2efe-11e7-bb3a-063320a53a26",
              "kilde": "Ekstern",
              "koordinater": [
                10.33144075,
                55.39500953
              ],
              "nøjagtighed": "B",
              "tekniskstandard": "V0"
            },
            "DDKN": {
              "m100": "100m_61395_5843",
              "km1": "1km_6139_584",
              "km10": "10km_613_58"
            },
            "sogn": {
              "kode": "0099",
              "navn": "Sogn test",
              "href": "http://dawa/sogne/99"
            },
            "region": null,
            "retskreds": {
              "kode": "0099",
              "navn": "retskreds test",
              "href": "http://dawa/retskredse/99"
            },
            "politikreds": {
              "kode": "0099",
              "navn": "Politikreds test",
              "href": "http://dawa/politikredse/99"
            },
            "opstillingskreds": {
              "kode": "0099",
              "navn": "Opstillingskreds test",
              "href": "http://dawa/opstillingskredse/99"
            },
            "zone": "Sommerhusområde",
            "jordstykke": null,
            "bebyggelser": [],
            "brofast": true,
            "afstemningsområde": {
              "href": "http://dawa/afstemningsomraader/461/2",
              "navn": "Test afstemningsområde",
              "nummer": "2"
            }
          }
        }]
      },
      geojsonz: {
        flad: [{
          params: {
            id: '0a3f5089-0408-32b8-e044-0003ba298018'
          },
          value: {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.3314668,
                55.3948974,
                31.3
              ]
            },
            "crs": {
              "type": "name",
              "properties": {
                "name": "EPSG:4326"
              }
            },
            "properties": {
              "id": "0a3f5089-0408-32b8-e044-0003ba298018",
              "status": 1,
              "oprettet": "2000-02-05T06:08:50.000",
              "ændret": "2012-01-17T21:00:12.943",
              "vejkode": "0855",
              "vejnavn": "Brammingevej",
              "vejpunkt_id": "39a03418-2efe-11e7-bb3a-063320a53a26",
              "vejpunkt_kilde": "Ekstern",
              "vejpunkt_nøjagtighed": "B",
              "vejpunkt_tekniskstandard": "V0",
              "vejpunkt_x": 10.33144075,
              "vejpunkt_y": 55.39500953,
              "adresseringsvejnavn": "Brammingevej",
              "husnr": "18",
              "supplerendebynavn": "Bolbro",
              "postnr": "5200",
              "postnrnavn": "Odense V",
              "stormodtagerpostnr": null,
              "stormodtagerpostnrnavn": null,
              "kommunekode": "0461",
              "kommunenavn": "Odense",
              "ejerlavkode": null,
              "ejerlavnavn": null,
              "matrikelnr": null,
              "esrejendomsnr": null,
              "adgangspunktid": "0a3f5089-0408-32b8-e044-0003ba298018",
              "etrs89koordinat_øst": 584330.74,
              "etrs89koordinat_nord": 6139543.21,
              "wgs84koordinat_bredde": 55.3948974,
              "wgs84koordinat_længde": 10.3314668,
              "nøjagtighed": "A",
              "kilde": 5,
              "tekniskstandard": "TN",
              "tekstretning": 196,
              "adressepunktændringsdato": "2009-02-11T23:59:00.000",
              "ddkn_m100": "100m_61395_5843",
              "ddkn_km1": "1km_6139_584",
              "ddkn_km10": "10km_613_58",
              "regionskode": null,
              "regionsnavn": null,
              "jordstykke_ejerlavkode": null,
              "jordstykke_matrikelnr": null,
              "jordstykke_esrejendomsnr": null,
              "jordstykke_ejerlavnavn": null,
              "højde": 31.3,
              "kvh": "04610855__18",
              "sognekode": "0099",
              "sognenavn": "Sogn test",
              "politikredskode": "0099",
              "politikredsnavn": "Politikreds test",
              "retskredskode": "0099",
              "retskredsnavn": "retskreds test",
              "afstemningsområdenummer": "2",
              "afstemningsområdenavn": "Test afstemningsområde",
              "opstillingskredskode": "0099",
              "opstillingskredsnavn": "Opstillingskreds test",
              "zone": "Sommerhusområde",
              "brofast": true,
            }
          }
        }, {
          params: {
            id: '0a3f5081-c394-32b8-e044-0003ba298018'
          },
          value: {
            "type": "Feature",
            "crs": {
              "properties": {
                "name": "EPSG:4326"
              },
              "type": "name"
            },
            "geometry": {
              "type": "Point",
              "coordinates": [
                11.93653806,
                55.53910358,
                46.4
              ]
            },
            "properties": {
              "id": "0a3f5081-c394-32b8-e044-0003ba298018",
              "status": 1,
              "oprettet": "2000-02-05T21:40:29.000",
              "ændret": "2013-11-01T11:23:52.353",
              "vejkode": "0347",
              "vejnavn": "Jonstrupvej",
              "adresseringsvejnavn": "Jonstrupvej",
              "vejpunkt_id": "360943f8-2efe-11e7-bb3a-063320a53a26",
              "vejpunkt_kilde": "Ekstern",
              "vejpunkt_nøjagtighed": "B",
              "vejpunkt_tekniskstandard": "V0",
              "vejpunkt_x": 11.93571617,
              "vejpunkt_y": 55.53903448,
              "husnr": "1B",
              "supplerendebynavn": "Boruphuse",
              "postnr": "4320",
              "postnrnavn": "Lejre",
              "stormodtagerpostnr": null,
              "stormodtagerpostnrnavn": null,
              "kommunekode": "0350",
              "kommunenavn": "Lejre",
              "ejerlavkode": null,
              "ejerlavnavn": null,
              "matrikelnr": null,
              "esrejendomsnr": null,
              "adgangspunktid": "0a3f5081-c394-32b8-e044-0003ba298018",
              "etrs89koordinat_øst": 685289.88,
              "etrs89koordinat_nord": 6158701.41,
              "wgs84koordinat_bredde": 55.53910358,
              "wgs84koordinat_længde": 11.93653806,
              "nøjagtighed": "A",
              "kilde": 5,
              "tekniskstandard": "TK",
              "tekstretning": 378,
              "adressepunktændringsdato": "2000-01-01T23:59:00.000",
              "ddkn_m100": "100m_61587_6852",
              "ddkn_km1": "1km_6158_685",
              "ddkn_km10": "10km_615_68",
              "regionskode": null,
              "regionsnavn": null,
              "jordstykke_ejerlavkode": 60851,
              "jordstykke_matrikelnr": "1a",
              "jordstykke_esrejendomsnr": "8571",
              "jordstykke_ejerlavnavn": "Borup, Osted",
              "højde": 46.4,
              "kvh": "03500347__1B",
              "sognekode": "0099",
              "sognenavn": "Sogn test",
              "politikredskode": "0099",
              "politikredsnavn": "Politikreds test",
              "retskredskode": "0099",
              "retskredsnavn": "retskreds test",
              "afstemningsområdenummer": "2",
              "afstemningsområdenavn": "Test afstemningsområde",
              "opstillingskredskode": "0099",
              "opstillingskredsnavn": "Opstillingskreds test",
              "zone": "Sommerhusområde",
              "brofast": true
            }
          }
        }]
      }
    },
    adresse: {
      json: {
        mini: [{
          params: {
            id: '0a3f50b3-a112-32b8-e044-0003ba298018'
          },
          value: {
            "id": "0a3f50b3-a112-32b8-e044-0003ba298018",
            "status": 1,
            "vejkode": "0855",
            "vejnavn": "Brammingevej",
            "adresseringsvejnavn": "Brammingevej",
            "husnr": "18",
            "etage": "1",
            "dør": "tv",
            "supplerendebynavn": "Bolbro",
            "postnr": "5200",
            "postnrnavn": "Odense V",
            "kommunekode": "0461",
            "adgangsadresseid": "0a3f5089-0408-32b8-e044-0003ba298018",
            "x": 10.3314668,
            "y": 55.3948974
          }
        }],
        nestet: [{
          params: {
            id: '0a3f50b3-a112-32b8-e044-0003ba298018'
          },
          value: {
            "id": "0a3f50b3-a112-32b8-e044-0003ba298018",
            "kvhx": "04610855__18__1__tv",
            "status": 1,
            "href": "http://dawa/adresser/0a3f50b3-a112-32b8-e044-0003ba298018",
            "historik": {
              "oprettet": "2000-02-05T06:08:50.000",
              "ændret": "2000-02-05T06:08:50.000"
            },
            "etage": "1",
            "dør": "tv",
            "adressebetegnelse": "Brammingevej 18, 1. tv, Bolbro, 5200 Odense V",
            "adgangsadresse": {
              "href": "http://dawa/adgangsadresser/0a3f5089-0408-32b8-e044-0003ba298018",
              "id": "0a3f5089-0408-32b8-e044-0003ba298018",
              "kvh": "04610855__18",
              "status": 1,
              "vejstykke": {
                "href": "http://dawa/vejstykker/461/855",
                "navn": "Brammingevej",
                "adresseringsnavn": "Brammingevej",
                "kode": "0855"
              },
              "husnr": "18",
              "supplerendebynavn": "Bolbro",
              "postnummer": {
                "href": "http://dawa/postnumre/5200",
                "nr": "5200",
                "navn": "Odense V"
              },
              "stormodtagerpostnummer": null,
              "kommune": {
                "href": "http://dawa/kommuner/0461",
                "kode": "0461",
                "navn": "Odense"
              },
              "ejerlav": null,
              "esrejendomsnr": null,
              "matrikelnr": null,
              "historik": {
                "oprettet": "2000-02-05T06:08:50.000",
                "ændret": "2012-01-17T21:00:12.943"
              },
              "adgangspunkt": {
                "id": "0a3f5089-0408-32b8-e044-0003ba298018",
                "koordinater": [
                  10.3314668,
                  55.3948974
                ],
                "højde": 31.3,
                "nøjagtighed": "A",
                "kilde": 5,
                "tekniskstandard": "TN",
                "tekstretning": 196,
                "ændret": "2009-02-11T23:59:00.000"
              },
              "vejpunkt": {
                "id": "39a03418-2efe-11e7-bb3a-063320a53a26",
                "kilde": "Ekstern",
                "koordinater": [
                  10.33144075,
                  55.39500953
                ],
                "nøjagtighed": "B",
                "tekniskstandard": "V0"
              },
              "DDKN": {
                "m100": "100m_61395_5843",
                "km1": "1km_6139_584",
                "km10": "10km_613_58"
              },
              "sogn": {
                "kode": "0099",
                "navn": "Sogn test",
                "href": "http://dawa/sogne/99"
              },
              "region": null,
              "retskreds": {
                "kode": "0099",
                "navn": "retskreds test",
                "href": "http://dawa/retskredse/99"
              },
              "politikreds": {
                "kode": "0099",
                "navn": "Politikreds test",
                "href": "http://dawa/politikredse/99"
              },
              "afstemningsområde": {
                "href": "http://dawa/afstemningsomraader/461/2",
                "navn": "Test afstemningsområde",
                "nummer": "2"
              },
              "opstillingskreds": {
                "kode": "0099",
                "navn": "Opstillingskreds test",
                "href": "http://dawa/opstillingskredse/99"
              },
              "zone": "Sommerhusområde",
              "jordstykke": null,
              "bebyggelser": [],
              "brofast": true
            }
          }
        }]
      },
      geojsonz: {
        flad: [{
          params: {
            id: '0a3f50b3-a112-32b8-e044-0003ba298018'
          },
          value: {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [
                10.3314668,
                55.3948974,
                31.3
              ]
            },
            "crs": {
              "type": "name",
              "properties": {
                "name": "EPSG:4326"
              }
            },
            "properties": {
              "id": "0a3f50b3-a112-32b8-e044-0003ba298018",
              "status": 1,
              "oprettet": "2000-02-05T06:08:50.000",
              "ændret": "2000-02-05T06:08:50.000",
              "vejkode": "0855",
              "vejnavn": "Brammingevej",
              "vejpunkt_id": "39a03418-2efe-11e7-bb3a-063320a53a26",
              "vejpunkt_kilde": "Ekstern",
              "vejpunkt_nøjagtighed": "B",
              "vejpunkt_tekniskstandard": "V0",
              "vejpunkt_x": 10.33144075,
              "vejpunkt_y": 55.39500953,
              "adresseringsvejnavn": "Brammingevej",
              "husnr": "18",
              "etage": "1",
              "dør": "tv",
              "supplerendebynavn": "Bolbro",
              "postnr": "5200",
              "postnrnavn": "Odense V",
              "stormodtagerpostnr": null,
              "stormodtagerpostnrnavn": null,
              "kommunekode": "0461",
              "kommunenavn": "Odense",
              "ejerlavkode": null,
              "ejerlavnavn": null,
              "matrikelnr": null,
              "esrejendomsnr": null,
              "etrs89koordinat_øst": 584330.74,
              "etrs89koordinat_nord": 6139543.21,
              "wgs84koordinat_bredde": 55.3948974,
              "wgs84koordinat_længde": 10.3314668,
              "nøjagtighed": "A",
              "kilde": 5,
              "tekniskstandard": "TN",
              "tekstretning": 196,
              "ddkn_m100": "100m_61395_5843",
              "ddkn_km1": "1km_6139_584",
              "ddkn_km10": "10km_613_58",
              "adgangspunktid": "0a3f5089-0408-32b8-e044-0003ba298018",
              "adressepunktændringsdato": "2009-02-11T23:59:00.000",
              "adgangsadresseid": "0a3f5089-0408-32b8-e044-0003ba298018",
              "adgangsadresse_status": 1,
              "adgangsadresse_oprettet": "2000-02-05T06:08:50.000",
              "adgangsadresse_ændret": "2012-01-17T21:00:12.943",
              "regionskode": null,
              "regionsnavn": null,
              "jordstykke_ejerlavnavn": null,
              "jordstykke_ejerlavkode": null,
              "jordstykke_matrikelnr": null,
              "jordstykke_esrejendomsnr": null,
              "højde": 31.3,
              "kvhx": "04610855__18__1__tv",
              "kvh": "04610855__18",
              "sognekode": "0099",
              "sognenavn": "Sogn test",
              "politikredskode": "0099",
              "politikredsnavn": "Politikreds test",
              "retskredskode": "0099",
              "retskredsnavn": "retskreds test",
              "afstemningsområdenummer": "2",
              "afstemningsområdenavn": "Test afstemningsområde",
              "opstillingskredskode": "0099",
              "opstillingskredsnavn": "Opstillingskreds test",
              "zone": "Sommerhusområde",
              "brofast": true
            }
          }
        }]
      }
    }
  };

  const propertiesToIgnoreMap = {
    afstemningsområde: {
      json: {
        flad: ['geo_ændret', 'ændret'],
        nestet: ['geo_ændret', 'ændret']
      }
    },
    opstillingskreds: {
      json: {
        flad: ['geo_ændret', 'ændret'],
        nestet: ['geo_ændret', 'ændret']
      }
    },
    storkreds: {
      json: {
        flad: ['geo_ændret', 'ændret'],
        nestet: ['geo_ændret', 'ændret']
      }
    },
    valglandsdel: {
      json: {
        flad: ['geo_ændret', 'ændret'],
        nestet: ['geo_ændret', 'ændret']
      }
    },
    supplerendebynavn: {
      json: {
        flad: ['geo_ændret', 'ændret'],
        nestet: ['geo_ændret', 'ændret']
      }
    }
  };

  testdb.withTransactionEach('test', (clientFn) => {
    for (let entityName of Object.keys(expectedResults)) {
      const resource = registry.get({
        entityName: entityName,
        type: 'resource',
        qualifier: 'getByKey'
      });
      const formatMap = expectedResults[entityName];
      for (let format of Object.keys(formatMap)) {
        const strukturMap = formatMap[format];
        for (let struktur of Object.keys(strukturMap)) {
          const tests = strukturMap[struktur];
          it(`Return value for entity=${entityName},format=${format},struktur=${struktur}`, q.async(function*() {
            for (let test of tests) {
              let jsonResult = yield helpers.getJson(clientFn(), resource, test.params, {
                format: format,
                struktur: struktur
              });
              if(propertiesToIgnoreMap[entityName] && propertiesToIgnoreMap[entityName][format] && propertiesToIgnoreMap[entityName][format][struktur]) {
                const propertiesToIgnore = propertiesToIgnoreMap[entityName][format][struktur];
                for(let property of propertiesToIgnore) {
                  assert(jsonResult.hasOwnProperty(property));
                  delete jsonResult[property];
                  delete test.value[property];
                }
              }
              expect(jsonResult).to.deep.equal(test.value);
            }
          }))
        }
      }
    }
  });

});
