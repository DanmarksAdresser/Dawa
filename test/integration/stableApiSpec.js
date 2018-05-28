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
            "href": "http://dawa/supplerendebynavne2/100116",
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
            "supplerendebynavn2": {
              "dagi_id": "675271",
              "href": "http://dawa/supplerendebynavne2/675271"
            },
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
              "ændret": "2018-05-03T18:58:34.000"
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
              "id": "16147a6a-af45-11e7-847e-066cff24d637",
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
              "ændret": "2018-05-03T18:58:34.000",
              "vejkode": "0855",
              "vejnavn": "Brammingevej",
              "vejpunkt_id": "16147a6a-af45-11e7-847e-066cff24d637",
              "vejpunkt_kilde": "Ekstern",
              "vejpunkt_nøjagtighed": "B",
              "vejpunkt_tekniskstandard": "V0",
              "vejpunkt_x": 10.33144075,
              "vejpunkt_y": 55.39500953,
              "adresseringsvejnavn": "Brammingevej",
              "husnr": "18",
              "supplerendebynavn": "Bolbro",
              "supplerendebynavn_dagi_id": "675271",
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
              "navngivenvej_id": "a8121066-1db3-4e0e-a7e8-75d54d8723e9"
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
              "ændret": "2018-05-03T18:58:34.000",
              "vejkode": "0347",
              "vejnavn": "Jonstrupvej",
              "adresseringsvejnavn": "Jonstrupvej",
              "vejpunkt_id": "13be931d-af45-11e7-847e-066cff24d637",
              "vejpunkt_kilde": "Ekstern",
              "vejpunkt_nøjagtighed": "B",
              "vejpunkt_tekniskstandard": "V0",
              "vejpunkt_x": 11.93571617,
              "vejpunkt_y": 55.53903448,
              "husnr": "1B",
              "supplerendebynavn": "Boruphuse",
              "supplerendebynavn_dagi_id": "664217",
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
              "tekstretning": 178,
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
              "brofast": true,
              "navngivenvej_id": "14328bc4-4870-40f6-9d07-7ed985389998"
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
              "supplerendebynavn2": {
                "dagi_id": "675271",
                "href": "http://dawa/supplerendebynavne2/675271"
              },
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
                "ændret": "2018-05-03T18:58:34.000"
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
                "id": "16147a6a-af45-11e7-847e-066cff24d637",
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
              "vejpunkt_id": "16147a6a-af45-11e7-847e-066cff24d637",
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
              "supplerendebynavn_dagi_id": "675271",
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
              "adgangsadresse_ændret": "2018-05-03T18:58:34.000",
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
              "brofast": true,
              "navngivenvej_id": "a8121066-1db3-4e0e-a7e8-75d54d8723e9"
            }
          }
        }]
      }
    },
    navngivenvej: {
      json: {
        nestet: [{
          params: {
            id: "1e260555-5c81-434f-af77-1bea6fc4c8a8"
          },
          value: {
            "id": "1e260555-5c81-434f-af77-1bea6fc4c8a8",
            "href": "http://dawa/navngivneveje/1e260555-5c81-434f-af77-1bea6fc4c8a8",
            "darstatus": "gældende",
            "navn": "Gl. Assensvej",
            "adresseringsnavn": "Gl. Assensvej",
            "administrerendekommune": {
              "href": "http://dawa/kommuner/420",
              "kode": "0420",
              "navn": "Assens"
            },
            "retskrivningskontrol": "Godkendt",
            "udtaltvejnavn": "Gl. Assensvej",
            "historik": {
              "oprettet": "1900-01-01T12:00:00.000Z",
              "ændret": "1900-01-01T12:00:00.000Z"
            },
            "vejstykker": [
              {
                "href": "http://dawa/vejstykker/0420/0480",
                "kommunekode": "0420",
                "kode": "0480"
              }
            ],
            "beliggenhed": {
              "oprindelse": {
                "kilde": "Ekstern",
                "tekniskstandard": "N0",
                "registrering": "2018-05-03T15:57:30.356Z",
                "nøjagtighedsklasse": "B"
              },
              "geometritype": "vejnavnelinje",
              vejtilslutningspunkter: null
            }
          }
        }],
        flad: [{
          params: {
            id: "1e260555-5c81-434f-af77-1bea6fc4c8a8"
          },
          value: {
            "id": "1e260555-5c81-434f-af77-1bea6fc4c8a8",
            "darstatus": "gældende",
            "oprettet": "1900-01-01T12:00:00.000Z",
            "ændret": "1900-01-01T12:00:00.000Z",
            "navn": "Gl. Assensvej",
            "adresseringsnavn": "Gl. Assensvej",
            "administrerendekommunekode": "0420",
            "administrerendekommunenavn": "Assens",
            "retskrivningskontrol": "Godkendt",
            "udtaltvejnavn": "Gl. Assensvej",
            "beliggenhed_oprindelse_kilde": "Ekstern",
            "beliggenhed_oprindelse_nøjagtighedsklasse": "B",
            "beliggenhed_oprindelse_registrering": "2018-05-03T15:57:30.356Z",
            "beliggenhed_oprindelse_tekniskstandard": "N0",
            "beliggenhed_geometritype": "vejnavnelinje"
          }
        }]
      },
      geojson: {
        flad: [{
          params: {
            id: "1e260555-5c81-434f-af77-1bea6fc4c8a8"
          },
          value: {
            "type": "Feature",
            "geometry": {
              "type": "MultiLineString",
              "coordinates": [[[10.09803611, 55.37158792], [10.09815016, 55.37170048],
                [10.09838166, 55.37192873], [10.09851168, 55.37205355],
                [10.09854461, 55.37209163], [10.09858488, 55.37214401],
                [10.09860355, 55.37217449], [10.09860958, 55.37219843],
                [10.09861386, 55.37222733], [10.09861081, 55.37225404],
                [10.09859725, 55.37229425], [10.09858836, 55.37233225]]]
            },
            "crs": {
              "type": "name",
              "properties": {
                "name": "EPSG:4326"
              }
            },
            "properties": {
              "id": "1e260555-5c81-434f-af77-1bea6fc4c8a8",
              "darstatus": "gældende",
              "oprettet": "1900-01-01T12:00:00.000Z",
              "ændret": "1900-01-01T12:00:00.000Z",
              "navn": "Gl. Assensvej",
              "adresseringsnavn": "Gl. Assensvej",
              "administrerendekommunekode": "0420",
              "administrerendekommunenavn": "Assens",
              "retskrivningskontrol": "Godkendt",
              "udtaltvejnavn": "Gl. Assensvej",
              "beliggenhed_oprindelse_kilde": "Ekstern",
              "beliggenhed_oprindelse_nøjagtighedsklasse": "B",
              "beliggenhed_oprindelse_registrering": "2018-05-03T15:57:30.356Z",
              "beliggenhed_oprindelse_tekniskstandard": "N0",
              "beliggenhed_geometritype": "vejnavnelinje"
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
          it(`Return value for entity=${entityName},format=${format},struktur=${struktur}`, q.async(function* () {
            for (let test of tests) {
              let jsonResult = yield helpers.getJson(clientFn(), resource, test.params, {
                format: format,
                struktur: struktur
              });
              if (propertiesToIgnoreMap[entityName] && propertiesToIgnoreMap[entityName][format] && propertiesToIgnoreMap[entityName][format][struktur]) {
                const propertiesToIgnore = propertiesToIgnoreMap[entityName][format][struktur];
                for (let property of propertiesToIgnore) {
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
