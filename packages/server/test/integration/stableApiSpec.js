"use strict";

const _ = require('underscore');
const {assert, expect} = require('chai');
const q = require('q');

const helpers = require('./helpers');
const registry = require('../../apiSpecification/registry');
const testdb = require('@dawadk/test-util/src/testdb');

require('../../apiSpecification/allSpecs');

// These tests are expected to fail whenever the API is changed or extended
describe('Stable API', () => {
  const expectedResults = {
    vejstykke: {

      json: {
        mini: [{
          params: {
            kommunekode: '0101',
            kode: '0728'
          },
          value: {
            "kode": "0728",
            "kommunekode": "0101",
            "kommunenavn": "København",
            "navn": "Borgmester Christiansens Gade",
            "adresseringsnavn": "Borgm Christiansensg",
            "navngivenvej_id": "13eff875-5986-489b-b1e8-10ecacd95e09",
            "href": "http://dawa/vejstykker/101/728",
            "betegnelse": "Borgmester Christiansens Gade, København Kommune (0728)"
          }
        }],
        nestet: [{
          params: {
            kommunekode: '0169',
            kode: '0001'
          },
          queryParams: {
            medtagnedlagte: 'true'
          },
          value: {
            "id": "66ddc463-f761-4582-a803-b663cd6756da",
            "darstatus": 4,
            "href": "http://dawa/vejstykker/169/1",
            "kode": "0001",
            "navn": "Holbækmotorvejen",
            "adresseringsnavn": "Holbækmotorvejen",
            "navngivenvej": {
              "href": "http://dawa/navngivneveje/c0f08a1a-b9a4-465b-8372-d12babe7fbd6",
              "id": "c0f08a1a-b9a4-465b-8372-d12babe7fbd6",
              "darstatus": 3
            },
            "kommune": {
              "href": "http://dawa/kommuner/0169",
              "kode": "0169",
              "navn": "Høje-Taastrup"
            },
            "postnumre": [
              {
                "href": "http://dawa/postnumre/2640",
                "nr": "2640",
                "navn": "Hedehusene"
              }
            ],
            "historik": {
              "oprettet": "2018-05-17T10:55:12.245",
              "ændret": null,
              "nedlagt": "2018-05-17T10:55:12.245"
            }
          }
        }]
      }
    },
      region: {
        json: {
          nestet: [{
            params: {
              kode: '1084'
            },
            value: {
              "bbox": [
                12.5711324,
                55.59055443,
                12.57129891,
                55.59064873
              ],
              "dagi_id": "100001",
              "geo_version": 1,
              "geo_ændret": "2019-05-27T07:30:38.403Z",
              "href": "http://dawa/regioner/1084",
              "kode": "1084",
              "navn": "Region test",
              "nuts2": "DK02",
              "visueltcenter": [
                12.57121565,
                55.59060158
              ],
              "ændret": "2019-05-27T07:30:38.403Z"
            }
          }],
          flad: [{
            params: {
              kode: '1084'
            },
            value: {
              "bbox_xmax": 12.57129891,
              "bbox_xmin": 12.5711324,
              "bbox_ymax": 55.59064873,
              "bbox_ymin": 55.59055443,
              "dagi_id": "100001",
              "geo_version": 1,
              "geo_ændret": "2019-05-27T07:30:38.403Z",
              "kode": "1084",
              "navn": "Region test",
              "nuts2": "DK02",
              "visueltcenter_x": 12.57121565,
              "visueltcenter_y": 55.59060158,
              "ændret": "2019-05-27T07:30:38.403Z"
            }
          }]
        }
      },
      landsdel: {
        json: {
          mini: [{
            params: {
              nuts3: 'DK014'
            },
            value: {
              "dagi_id": "200002",
              "navn": "Landsdel test",
              "nuts3": "DK014",
              "regionskode": "1084",
              "regionsnavn": "Region test",
              "bbox_xmin": 12.5711324,
              "bbox_ymin": 55.59055443,
              "bbox_xmax": 12.57129891,
              "bbox_ymax": 55.59064873,
              "visueltcenter_x": 12.57121565,
              "visueltcenter_y": 55.59060158,
              "href": "http://dawa/landsdele/DK014",
              "betegnelse": "Landsdel test (DK014)"
            }
          }],
          nestet: [{
            params: {
              nuts3: 'DK014'
            },
            value: {
              "bbox": [
                12.5711324,
                55.59055443,
                12.57129891,
                55.59064873
              ],
              "dagi_id": "200002",
              "geo_version": 1,
              "geo_ændret": "2019-05-27T07:30:38.403Z",
              "href": "http://dawa/landsdele/DK014",
              "navn": "Landsdel test",
              "nuts3": "DK014",
              "visueltcenter": [
                12.57121565,
                55.59060158
              ],
              "ændret": "2019-05-27T07:30:38.403Z",
              "region": {
                "href": "http://dawa/regioner/1084",
                "kode": "1084",
                "navn": "Region test"
              }
            }
          }],
          flad: [{
            params: {
              nuts3: 'DK014'
            },
            value: {
              "bbox_xmax": 12.57129891,
              "bbox_xmin": 12.5711324,
              "bbox_ymax": 55.59064873,
              "bbox_ymin": 55.59055443,
              "dagi_id": "200002",
              "geo_version": 1,
              "geo_ændret": "20190527T08:59:51.957Z",
              "navn": "Landsdel test",
              "nuts3": "DK014",
              "regionskode": "1084",
              "regionsnavn": "Region test",
              "visueltcenter_x": 12.57121565,
              "visueltcenter_y": 55.59060158,
              "ændret": "20190527T08:59:51.957Z"
            }
          }]
        }
      },
      kommune: {
        json: {
        nestet: [{
          params: {
            kode: 99
          },
          value: {
            "ændret": "2018-12-11T15:17:45.067Z",
            "geo_version": 1,
            "geo_ændret": "2018-12-11T15:17:45.067Z",
            "bbox": [
              12.5711324,
              55.59055443,
              12.57129891,
              55.59064873
            ],
            "visueltcenter": [
              12.57121565,
              55.59060158
            ],
            "href": "http://dawa/kommuner/0099",
            "dagi_id": "100101",
            "kode": "0099",
            "navn": "Kommune test",
            "udenforkommuneinddeling": false,
            "regionskode": "1084",
            "region": {
              "href": "http://dawa/regioner/1084",
              "kode": "1084",
              "navn": "Region test"
            }
          }
        }]
      }
    },
    menighedsrådsafstemningsområde: {
      json: {
        nestet: [{
          params: {
            kommunekode: 99,
            nummer: 1
          },
          value: {
            "ændret": "2018-10-31T10:48:45.079Z",
            "geo_version": 1,
            "geo_ændret": "2018-10-31T10:48:45.079Z",
            "bbox": [
              12.5711324,
              55.59055443,
              12.57129891,
              55.59064873
            ],
            "visueltcenter": [
              12.57121565,
              55.59060158
            ],
            "href": "http://dawa/menighedsraadsafstemningsomraader/99/1",
            "dagi_id": "100102",
            "nummer": "1",
            "navn": "MRAfstemningsområde Test",
            "kommune": {
              "href": "http://dawa/kommuner/0099",
              "kode": "0099",
              "navn": "Kommune test"
            },
            "sogn": {
              "href": "http://dawa/sogne/7210",
              "kode": "7210",
              "navn": "Sogn test"
            }
          }
        }]
      }
    },
    jordstykke: {
      json: {
        flad: [{
          params: {
            ejerlavkode: '60851',
            matrikelnr: '2l'
          },
          value: {
            "ændret": "2019-06-03T11:05:05.529Z",
            "geo_ændret": "2019-06-03T11:05:05.529Z",
            "geo_version": 1,
            "bbox_xmin": 11.92586691,
            "bbox_ymin": 55.53834055,
            "bbox_xmax": 11.92651545,
            "bbox_ymax": 55.53872082,
            "visueltcenter_x": 11.92622789,
            "visueltcenter_y": 55.53850121,
            "ejerlavkode": 60851,
            "matrikelnr": "2l",
            "kommunekode": "0350",
            "kommunenavn": "Lejre",
            "sognekode": "7171",
            "sognenavn": "Sogn test 2",
            "regionskode": "1085",
            "regionsnavn": "Region test 2",
            "retskredskode": "1118",
            "retskredsnavn": null,
            "udvidet_esrejendomsnr": "3500009408",
            "esrejendomsnr": "9408",
            "sfeejendomsnr": "2226262",
            "ejerlavnavn": "Borup, Osted",
            "featureid": "876294",
            "fælleslod": false,
            "moderjordstykke": null,
            "registreretareal": 869,
            "arealberegningsmetode": "k",
            "vejareal": 0,
            "vejarealberegningsmetode": "u",
            "vandarealberegningsmetode": "incl"
          }
        }],
        nestet: [{
          params: {
            ejerlavkode: '60851',
            matrikelnr: '2l'
          },
          value: {
            "matrikelnr": "2l",
            "bbox": [
              11.92586691,
              55.53834055,
              11.92651545,
              55.53872082
            ],
            "visueltcenter": [
              11.92622789,
              55.53850121
            ],
            "href": "http://dawa/jordstykker/60851/2l",
            "ejerlav": {
              "kode": 60851,
              "navn": "Borup, Osted",
              "href": "http://dawa/ejerlav/60851"
            },
            "kommune": {
              "href": "http://dawa/kommuner/0350",
              "kode": "0350",
              "navn": "Lejre"
            },
            "esrejendomsnr": "9408",
            "udvidet_esrejendomsnr": "3500009408",
            "sfeejendomsnr": "2226262",
            "ændret": "2019-06-03T11:05:05.529Z",
            "geo_version": 1,
            "geo_ændret": "2019-06-03T11:05:05.529Z",
            "fælleslod": false,
            "moderjordstykke": null,
            "registreretareal": 869,
            "arealberegningsmetode": "k",
            "vejareal": 0,
            "vejarealberegningsmetode": "u",
            "vandarealberegningsmetode": "incl",
            "featureid": "876294",
            "region": {
              "href": "http://dawa/regioner/1085",
              "kode": "1085",
              "navn": "Region test 2"
            },
            "sogn": {
              "href": "http://dawa/sogne/7171",
              "kode": "7171",
              "navn": "Sogn test 2"
            },
            "retskreds": null
          }
        }]
      }
    },
      bygning: {
        json: {
          nestet: [
            {
              params: {
                id: 1071735134
              },
              value: {
                "href": "http://dawa/bygninger/1071735134",
                "id": "1071735134",
                "bygningstype": "Bygning",
                "metode3d": "Tag",
                "synlig": true,
                "overlap": false,
                "målested": "Tag",
                "bbrbygning": {
                  "id": "2c7cacc9-b5cf-44c8-8079-c2657da1aca6",
                  "href": "http://dawa/bbrlight/bygninger/2c7cacc9-b5cf-44c8-8079-c2657da1aca6"
                },
                "adgangsadresser": [
                  {
                    "adressebetegnelse": "Nørregade 44, 5000 Odense C",
                    "href": "http://dawa/adgangsadresser/0a3f5089-911f-32b8-e044-0003ba298018",
                    "id": "0a3f5089-911f-32b8-e044-0003ba298018"
                  },
                  {
                    "adressebetegnelse": "Nørregade 44B, 5000 Odense C",
                    "href": "http://dawa/adgangsadresser/0a3f5089-9120-32b8-e044-0003ba298018",
                    "id": "0a3f5089-9120-32b8-e044-0003ba298018"
                  }

                ],
                "kommuner": [],
                "ændret": "2015-02-24T08:21:15.000Z",
                "bbox": [
                  10.38810747,
                  55.3996877,
                  10.38846407,
                  55.39980462
                ],
                "visueltcenter": [
                  10.38834483,
                  55.39973843
                ]
              }
            }
          ]
        },
        geojson: {
    flad: [{
      params: {
        id: 1071735134
      },
      value: {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [
                10.38813116,
                55.39980439
              ],
              [
                10.38810894,
                55.39973383
              ],
              [
                10.38842207,
                55.39968813
              ],
              [
                10.38846273,
                55.39976235
              ],
              [
                10.38813116,
                55.39980439
              ]
            ]
          ]
        },
        "crs": {
          "type": "name",
          "properties": {
            "name": "EPSG:4326"
          }
        },
        "properties": {
          "ændret": "2015-02-24T08:21:15.000Z",
          "visueltcenter_x": 10.38834483,
          "visueltcenter_y": 55.39973843,
          "id": "1071735134",
          "bbrbygning_id": "2c7cacc9-b5cf-44c8-8079-c2657da1aca6",
          "bygningstype": "Bygning",
          "metode3d": "Tag",
          "synlig": true,
          "overlap": false,
          "målested": "Tag"
        },
        "bbox": [
          10.38810747,
          55.3996877,
          10.38846407,
          55.39980462
        ]
      }
    }]
  }
},

  stednavn: {
      json: {
        mini: [{
          params: {
            stedid: '19e4392f-c7b1-5d41-0000-d380220a2006',
            navn: 'Test stednavn punkt'
          },
          value: {
              "sted_id": "19e4392f-c7b1-5d41-0000-d380220a2006",
              "sted_hovedtype": "Bygning",
              "sted_undertype": "hal",
              "navn": "Test stednavn punkt",
              "brugsprioritet": "primær",
              "navnestatus": "officielt",
              "href": "http://dawa/stednavne2/19e4392f-c7b1-5d41-0000-d380220a2006/Test%20stednavn%20punkt",
              "betegnelse": "Test stednavn punkt, Kommune test Kommune (hal)"
            }
        }]
      },
    geojson: {
      flad: [{
        params: {
          stedid: '19e4392f-c7b1-5d41-0000-d380220a2006',
          navn: 'Test stednavn punkt'
        },
        value: {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              12.57114905,
              55.59056756
            ]
          },
          "crs": {
            "type": "name",
            "properties": {
              "name": "EPSG:4326"
            }
          },
          "properties": {
            "sted_id": "19e4392f-c7b1-5d41-0000-d380220a2006",
            "sted_hovedtype": "Bygning",
            "sted_undertype": "hal",
            "sted_indbyggerantal": null,
            "sted_bebyggelseskode": null,
            "sted_ændret": "2018-06-20T13:18:49.863Z",
            "sted_geo_ændret": "2018-06-20T13:18:49.863Z",
            "sted_geo_version": 1,
            "sted_primærtnavn": "Test stednavn punkt",
            "sted_primærnavnestatus": "officielt",
            "sted_bbox_xmax": null,
            "sted_bbox_xmin": null,
            "sted_bbox_ymax": null,
            "sted_bbox_ymin": null,
            "sted_visueltcenter_x": 12.57114905,
            "sted_visueltcenter_y": 55.59056756,
            "sted_brofast": true,
            "navn": "Test stednavn punkt",
            "brugsprioritet": "primær",
            "navnestatus": "officielt"
          }
        }
      }]
    }
  }
,
  ejerlav: {

    json: {
      mini: [{
        params: {
          kode: '60851'
        },
        value: {
          "kode": 60851,
          "navn": "Borup, Osted",
          "visueltcenter_x": 11.93255624,
          "visueltcenter_y": 55.53796482,
          "href": "http://dawa/ejerlav/60851",
          "betegnelse": "Borup, Osted (60851)"
        }
      }],
      nestet: [{
        params: {
          kode: '60851'
        },
        value: {
          "href": "http://dawa/ejerlav/60851",
          "kode": 60851,
          "navn": "Borup, Osted",
          "bbox": [
            11.92440688,
            55.5304545,
            11.94218098,
            55.5464737
          ],
          "visueltcenter": [
            11.93255624,
            55.53796482
          ]
        }
      }]
    }
  ,
    geojson: {
      flad: [{
        params: {
          kode: '60851'
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
            "type": "MultiPolygon",
            "coordinates": [[[[11.94193016, 55.54310195], [11.94196622, 55.54320229], [11.94192757, 55.54331081], [11.94179792, 55.54339995], [11.94149428, 55.54348225], [11.94136208, 55.54362334], [11.94130405, 55.54370923], [11.94128206, 55.54374172], [11.94127556, 55.54384805], [11.9412315, 55.54390354], [11.94106946, 55.54404338], [11.94090039, 55.54426908], [11.94082766, 55.54436968], [11.94071296, 55.54461603], [11.94068307, 55.54470363], [11.94070999, 55.54491783], [11.94063245, 55.54509069], [11.94043436, 55.54539077], [11.94012565, 55.54547642], [11.94001563, 55.54551612], [11.93985422, 55.54553084], [11.93975759, 55.54555897], [11.93970683, 55.5455761], [11.9396236, 55.54558476], [11.9394844, 55.54554722], [11.9394238, 55.54553447], [11.93901695, 55.54546736], [11.93860954, 55.54539531], [11.93820531, 55.54530696], [11.93724728, 55.54512112], [11.93702753, 55.54506947], [11.93688006, 55.54503442], [11.93668816, 55.54505844], [11.93658948, 55.54505689], [11.93634998, 55.54508552], [11.9360957, 55.54509357], [11.93600703, 55.54511904], [11.93591281, 55.54515853], [11.93588522, 55.5451702], [11.93574411, 55.5452827], [11.93560928, 55.54542822], [11.93553739, 55.54546381], [11.93532992, 55.5455412], [11.93521643, 55.54558409], [11.93501233, 55.54571508], [11.93496521, 55.54579306], [11.93485163, 55.54598107], [11.93474973, 55.5460363], [11.93472415, 55.54604487], [11.93465077, 55.5460684], [11.93450347, 55.54607586], [11.93436308, 55.54608066], [11.9340142, 55.54608155], [11.93335592, 55.54621659], [11.93304641, 55.54627576], [11.93289107, 55.5462985], [11.93303056, 55.54621623], [11.93301996, 55.54599308], [11.93306402, 55.54567881], [11.9331596, 55.54551049], [11.93343521, 55.54531945], [11.93348198, 55.54502176], [11.93332288, 55.54483751], [11.93326417, 55.54481004], [11.93324734, 55.54480505], [11.9331257, 55.5447675], [11.93302347, 55.54468056], [11.93294239, 55.54453565], [11.93261114, 55.54441927], [11.93255328, 55.54438269], [11.93250119, 55.54423407], [11.93225973, 55.54397782], [11.93224589, 55.54396489], [11.93183086, 55.54366932], [11.93161672, 55.54341639], [11.93120296, 55.54318947], [11.93103482, 55.54304664], [11.93091762, 55.54286158], [11.93061035, 55.54271863], [11.93019731, 55.54257708], [11.93016376, 55.54246271], [11.93006903, 55.54234127], [11.9299853, 55.54213042], [11.92970427, 55.54186438], [11.92948532, 55.5419038], [11.92935035, 55.54189934], [11.92925205, 55.54185187], [11.92919438, 55.54174405], [11.92907265, 55.54168617], [11.9289718, 55.54167381], [11.92878665, 55.54166795], [11.92873977, 55.54163886], [11.92874395, 55.54159864], [11.92879639, 55.54155124], [11.92870948, 55.54143969], [11.92836333, 55.54115737], [11.92824711, 55.54091726], [11.92821408, 55.54084901], [11.92819421, 55.54077095], [11.92817051, 55.54072547], [11.92808932, 55.54058863], [11.92806875, 55.54046113], [11.92802099, 55.54040613], [11.92797556, 55.54035384], [11.92774027, 55.54024681], [11.92773242, 55.54024356], [11.927677, 55.54021891], [11.92749502, 55.54017164], [11.92730206, 55.54012234], [11.92725828, 55.5401088], [11.92716974, 55.54010625], [11.92691397, 55.54004524], [11.92687207, 55.54002303], [11.9266626, 55.53991196], [11.92663822, 55.5398828], [11.92643785, 55.53964332], [11.92626608, 55.53941022], [11.9261584, 55.53926408], [11.92602944, 55.53896428], [11.92594108, 55.53871969], [11.92587767, 55.53850018], [11.92581952, 55.53829884], [11.92575849, 55.5381968], [11.9256624, 55.53803613], [11.92550789, 55.5379323], [11.92531703, 55.53786055], [11.92520679, 55.53781913], [11.92522287, 55.53776352], [11.92503831, 55.53763998], [11.92490121, 55.53750823], [11.92494243, 55.53743072], [11.92506443, 55.53736999], [11.92510165, 55.53735243], [11.92541528, 55.53722361], [11.92568883, 55.53709941], [11.92590937, 55.53706807], [11.92599827, 55.5370012], [11.92619542, 55.53681618], [11.92680225, 55.53666082], [11.92682889, 55.5365622], [11.92690992, 55.53638873], [11.92677689, 55.53623112], [11.92655026, 55.53616662], [11.92637377, 55.53605646], [11.9261084, 55.53584767], [11.9259617, 55.53568927], [11.92593883, 55.53557354], [11.92603259, 55.53544715], [11.92607648, 55.53533498], [11.92606271, 55.53517996], [11.92611077, 55.53498626], [11.92625149, 55.5349131], [11.92621714, 55.53470072], [11.92626291, 55.53432624], [11.92622613, 55.53419467], [11.92589063, 55.53370312], [11.92577115, 55.53319502], [11.92583034, 55.53302259], [11.92623093, 55.53290589], [11.92697543, 55.53263377], [11.92708542, 55.53237517], [11.92730186, 55.53224114], [11.92738275, 55.53210325], [11.92748102, 55.53200327], [11.92758584, 55.53191965], [11.92796882, 55.5317454], [11.92810177, 55.53170526], [11.92856966, 55.53171747], [11.92890318, 55.53160717], [11.92918005, 55.53154575], [11.92935231, 55.53148268], [11.92950608, 55.53137144], [11.9295676, 55.5312807], [11.92955391, 55.53115904], [11.92955722, 55.53104414], [11.92952525, 55.53090611], [11.92956808, 55.53073862], [11.92981717, 55.53072297], [11.92993857, 55.53075947], [11.9301126, 55.53082952], [11.93020437, 55.53083513], [11.93043581, 55.53083854], [11.9306538, 55.53089694], [11.9310003, 55.53108841], [11.93159513, 55.53130089], [11.9316811, 55.53131551], [11.93177088, 55.53136543], [11.93245835, 55.53145328], [11.9325849, 55.53151415], [11.93293354, 55.53158657], [11.93330232, 55.5315709], [11.93370386, 55.53158407], [11.93407568, 55.53161971], [11.93455439, 55.5317948], [11.93500895, 55.53210067], [11.93507752, 55.53218937], [11.93505192, 55.53237134], [11.9350855, 55.53240925], [11.93503975, 55.53267441], [11.93507101, 55.53277977], [11.93519747, 55.53285912], [11.93521976, 55.53294248], [11.93533117, 55.53303372], [11.93562739, 55.53317058], [11.93569675, 55.53317736], [11.93582055, 55.53323271], [11.93591559, 55.53326478], [11.93623694, 55.53336344], [11.93644586, 55.53339136], [11.93798037, 55.53356433], [11.93853461, 55.53394924], [11.93867293, 55.53659018], [11.93889862, 55.53726743], [11.93891371, 55.53731284], [11.9389965, 55.53756129], [11.93893032, 55.5378053], [11.93869726, 55.53845725], [11.93864745, 55.53860103], [11.93863376, 55.53879569], [11.93871651, 55.53903333], [11.9387806, 55.53928819], [11.93936986, 55.53987338], [11.93985957, 55.54014998], [11.93984679, 55.54033167], [11.9398861, 55.54048527], [11.9399884, 55.54067327], [11.94010361, 55.54102968], [11.94010268, 55.54117834], [11.94011926, 55.54125772], [11.94024503, 55.54135725], [11.94045569, 55.54148194], [11.94050895, 55.54152484], [11.94059408, 55.54164058], [11.9406002, 55.54164871], [11.94066217, 55.54175735], [11.94099974, 55.54215281], [11.94092417, 55.54224208], [11.94091485, 55.54225142], [11.9408807, 55.54229096], [11.94078951, 55.54235512], [11.94074614, 55.54238987], [11.94070236, 55.54244331], [11.94068504, 55.54249163], [11.94067653, 55.54254365], [11.94068193, 55.54263484], [11.94072079, 55.54266815], [11.94075983, 55.54268732], [11.9408204, 55.54270737], [11.94085441, 55.54271863], [11.9409886, 55.54275774], [11.94115378, 55.54277539], [11.94145812, 55.54277911], [11.94162501, 55.54278447], [11.94166284, 55.54279972], [11.94173315, 55.54285127], [11.94179014, 55.54289517], [11.94193016, 55.54310195]]]]
          },
          bbox: [
            11.92440688,
            55.5304545,
            11.94218098,
            55.5464737
          ],
          "properties": {
            "kode": 60851,
            "navn": "Borup, Osted",
            "visueltcenter_x": 11.93255624,
            "visueltcenter_y": 55.53796482
          }
        }
      }]
    }
  }
,
  afstemningsområde: {
    json: {
      nestet: [{
        params: {
          kommunekode: '99',
          nummer: '20'
        },
        value: {
          "href": "http://dawa/afstemningsomraader/99/20",
          "dagi_id": "704390",
          "ændret": "2018-05-02T06:50:28.217Z",
          "geo_version": 1,
          "geo_ændret": "2018-05-02T06:50:28.217Z",
          "bbox": [
            12.5711324,
            55.59055443,
            12.57129891,
            55.59064873
          ],
          "visueltcenter": [
            12.57121565,
            55.59060158
          ],
          "nummer": "20",
          "navn": "Dåstrup",
          "afstemningssted": {
            "navn": "Dåstrup Skole, HALLEN",
            "adgangsadresse": {
              "href": "http://dawa/adgangsadresser/0a3f5089-86cc-32b8-e044-0003ba298018",
              "id": "0a3f5089-86cc-32b8-e044-0003ba298018",
              "adressebetegnelse": "Møllemarksvej 27C, Bolbro, 5200 Odense V",
              "koordinater": [
                10.34422438,
                55.39575418
              ]
            }
          },
          "kommune": {
            "href": "http://dawa/kommuner/0099",
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
      flad:
        [{
          params: {
            kommunekode: '99',
            nummer: '20'
          },
          value: {
            "dagi_id": "704390",
            "nummer": "20",
            "navn": "Dåstrup",
            "afstemningsstednavn": "Dåstrup Skole, HALLEN",
            "afstemningsstedadresseid": "0a3f5089-86cc-32b8-e044-0003ba298018",
            "afstemningsstedadressebetegnelse": "Møllemarksvej 27C, Bolbro, 5200 Odense V",
            "afstemningssted_adgangspunkt_x": 10.34422438,
            "afstemningssted_adgangspunkt_y": 55.39575418,
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
            "bbox_xmax": 12.57129891,
            "bbox_xmin": 12.5711324,
            "bbox_ymax": 55.59064873,
            "bbox_ymin": 55.59055443,
            "visueltcenter_x": 12.57121565,
            "visueltcenter_y": 55.59060158,
            "geo_version": 1
          }
        }]
    },
    geojson: {
      nestet: [
        {
          params: {
            kommunekode: '99',
            nummer: '20'
          },
          value: {
            "type": "Feature",
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [
                      12.5711324,
                      55.59055905
                    ],
                    [
                      12.57129076,
                      55.59055443
                    ],
                    [
                      12.57129891,
                      55.59064411
                    ],
                    [
                      12.57114055,
                      55.59064873
                    ],
                    [
                      12.5711324,
                      55.59055905
                    ]
                  ]
                ]
              ]
            },
            "crs": {
              "type": "name",
              "properties": {
                "name": "EPSG:4326"
              }
            },
            "properties": {
              "ændret": "2018-10-30T09:44:46.588Z",
              "geo_version": 1,
              "geo_ændret": "2018-10-30T09:44:46.588Z",
              "bbox": [
                12.5711324,
                55.59055443,
                12.57129891,
                55.59064873
              ],
              "visueltcenter": [
                12.57121565,
                55.59060158
              ],
              "href": "http://dawa/afstemningsomraader/99/20",
              "dagi_id": "704390",
              "nummer": "20",
              "navn": "Dåstrup",
              "afstemningssted": {
                "navn": "Dåstrup Skole, HALLEN",
                "adgangsadresse": {
                  "href": "http://dawa/adgangsadresser/0a3f5089-86cc-32b8-e044-0003ba298018",
                  "id": "0a3f5089-86cc-32b8-e044-0003ba298018",
                  "adressebetegnelse": "Møllemarksvej 27C, Bolbro, 5200 Odense V",
                  "koordinater": [
                    10.34422438,
                    55.39575418
                  ]
                }
              },
              "kommune": {
                "href": "http://dawa/kommuner/0099",
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
          }
        }]
    }
  }   ,
    opstillingskreds: {
      json: {
        nestet: [{
            params: {
              kode: '99'
            },
        value: {
          "href": "http://dawa/opstillingskredse/99",
          "dagi_id": "100104",
          "ændret": "2018-05-02T06:50:28.217Z",
          "geo_version": 1,
          "geo_ændret": "2018-05-02T06:50:28.217Z",
          "bbox": [
            12.5711324,
            55.59055443,
            12.57129891,
            55.59064873
          ],
          "visueltcenter": [
            12.57121565,
            55.59060158
          ],
          "nummer": "99",
          "kode": "0099",
          "navn": "Opstillingskreds test",
          "kredskommune": {
            "href": "http://dawa/kommuner/0099",
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
        flad
    :
      [{
        params: {
          kode: '99'
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
          "geo_version": 1,
          "bbox_xmax": 12.57129891,
          "bbox_xmin": 12.5711324,
          "bbox_ymax": 55.59064873,
          "bbox_ymin": 55.59055443,
          "visueltcenter_x": 12.57121565,
          "visueltcenter_y": 55.59060158,
        }
      }]
    }
  }
,
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
          "bbox": [
            12.5711324,
            55.59055443,
            12.57129891,
            55.59064873
          ],
          "visueltcenter": [
            12.57121565,
            55.59060158
          ],
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
        flad
    :
      [{
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
          "geo_version": 1,
          "bbox_xmax": 12.57129891,
          "bbox_xmin": 12.5711324,
          "bbox_ymax": 55.59064873,
          "bbox_ymin": 55.59055443,
          "visueltcenter_x": 12.57121565,
          "visueltcenter_y": 55.59060158,
        }
      }]
    }
  }
,
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
          "bbox": [
            12.5711324,
            55.59055443,
            12.57129891,
            55.59064873
          ],
          "visueltcenter": [
            12.57121565,
            55.59060158
          ],
          "href": "http://dawa/valglandsdele/A"
        }

      }],
        flad
    :
      [{
        params: {
          bogstav: 'A'
        },
        value: {
          "bogstav": "A",
          "navn": "Valglandsdel test",
          "ændret": "2018-05-02T06:50:28.217Z",
          "geo_version": 1,
          "bbox_xmax": 12.57129891,
          "bbox_xmin": 12.5711324,
          "bbox_ymax": 55.59064873,
          "bbox_ymin": 55.59055443,
          "visueltcenter_x": 12.57121565,
          "visueltcenter_y": 55.59060158,
          "geo_ændret": "2018-05-02T06:50:28.217Z",
        }
      }]
    }
  }
,
  supplerendebynavn: {
    json: {
      mini: [{
        params: {
          dagi_id: "655869"
        },
        value: {
          "dagi_id": "655869",
          "navn": "Kragerup",
          "darstatus": 3,
          "kommunekode": null,
          "kommunenavn": null,
          "bbox_xmin": null,
          "bbox_ymin": null,
          "bbox_xmax": null,
          "bbox_ymax": null,
          "visueltcenter_x": null,
          "visueltcenter_y": null,
          "href": "http://dawa/supplerendebynavne2/655869",
          "betegnelse": "Kragerup, null Kommune"
        }
      }],
      nestet: [{
        params: {
          dagi_id: "665614"
        },
        value: {
          "ændret": "2018-10-30T09:44:46.588Z",
          "geo_version": 1,
          "geo_ændret": "2018-10-30T09:44:46.588Z",
          "bbox": [
            12.27501501,
            55.64787833,
            12.27504823,
            55.64789712
          ],
          "visueltcenter": [
            12.27503162,
            55.64788773
          ],
          "href": "http://dawa/supplerendebynavne2/665614",
          "dagi_id": "665614",
          "navn": "Høje Taastrup",
          "darstatus": 3,
          "kommune": {
            "href": "http://dawa/kommuner/0169",
            "kode": "0169",
            "navn": "Høje-Taastrup"
          },
          "postnumre": [
            {
              "href": "http://dawa/postnumre/2630",
              "nr": "2630",
              "navn": "Taastrup"
            }
          ]
        }
      }],
        flad
    :
      [{
        params: {
          dagi_id: "665614"
        },
        value: {
          "dagi_id": "665614",
          "navn": "Høje Taastrup",
          "darstatus": 3,
          "kommunekode": "0169",
          "kommunenavn": "Høje-Taastrup",
          "ændret": "2019-05-09T09:40:09.226Z",
          "geo_ændret": "2019-05-09T09:40:09.226Z",
          "geo_version": 1,
          "bbox_xmin": 12.27501501,
          "bbox_ymin": 55.64787833,
          "bbox_xmax": 12.27504823,
          "bbox_ymax": 55.64789712,
          "visueltcenter_x": 12.27503162,
          "visueltcenter_y": 55.64788773
        }
      }]
    }
  }
,
  adgangsadresse: {
    json: {
      mini: [{
        params: {
          id: '0a3f5089-0408-32b8-e044-0003ba298018'
        },
        value: {
          "betegnelse": "Brammingevej 18, Bolbro, 5200 Odense V",
          "id": "0a3f5089-0408-32b8-e044-0003ba298018",
          "href": "http://dawa/adgangsadresser/0a3f5089-0408-32b8-e044-0003ba298018",
          "status": 1,
          "darstatus": 3,
          "vejkode": "0855",
          "vejnavn": "Brammingevej",
          "adresseringsvejnavn": "Brammingevej",
          "husnr": "18",
          "supplerendebynavn": "Bolbro",
          "postnr": "5200",
          "postnrnavn": "Odense V",
          "stormodtagerpostnr": null,
          "stormodtagerpostnrnavn": null,
          "kommunekode": "0461",
          "x": 10.3314668,
          "y": 55.3948974
        }
      }],
        nestet
    :
      [{
        params: {
          id: '0a3f5089-0408-32b8-e044-0003ba298018'
        },
        value: {
          "href": "http://dawa/adgangsadresser/0a3f5089-0408-32b8-e044-0003ba298018",
          "id": "0a3f5089-0408-32b8-e044-0003ba298018",
          "kvh": "04610855__18",
          "status": 1,
          "darstatus": 3,
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
          "navngivenvej": {
            "href": "http://dawa/navngivneveje/a8121066-1db3-4e0e-a7e8-75d54d8723e9",
            "id": "a8121066-1db3-4e0e-a7e8-75d54d8723e9"
          },
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
            "ændret": "2018-07-04T18:00:00.000",
            "nedlagt": null,
            "ikrafttrædelse": "2000-02-05T06:08:50.000"
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
            "tekniskstandard": "V0",
            "ændret": "2018-05-03T14:08:02.125"
          },
          "DDKN": {
            "m100": "100m_61395_5843",
            "km1": "1km_6139_584",
            "km10": "10km_613_58"
          },
          "sogn": {
            "kode": "7776",
            "navn": "Bolbro",
            "href": "http://dawa/sogne/7776"
          },
          "region": {
            "href": "http://dawa/regioner/1084",
            "kode": "1084",
            "navn": "Region test"
          },
          "landsdel": {
            "href": "http://dawa/landsdele/DK014",
            "navn": "Landsdel test",
            "nuts3": "DK014"
          },
          "retskreds": {
            "kode": "0099",
            "navn": "retskreds test",
            "href": "http://dawa/retskredse/0099"
          },
          "politikreds": {
            "kode": "0099",
            "navn": "Politikreds test",
            "href": "http://dawa/politikredse/0099"
          },
          "opstillingskreds": {
            "kode": "0099",
            "navn": "Opstillingskreds test",
            "href": "http://dawa/opstillingskredse/0099"
          },
          "zone": "Landzone",
          "jordstykke": null,
          "bebyggelser": [],
          "brofast": true,
          "afstemningsområde": {
            "href": "http://dawa/afstemningsomraader/461/12",
            "navn": "Csv-Skolen",
            "nummer": "12"
          },
          "storkreds": {
            "href": "http://dawa/storkredse/1",
            "navn": "Storkreds test",
            "nummer": "1"
          },
          "valglandsdel": {
            "bogstav": "A",
            "href": "http://dawa/valglandsdele/A",
            "navn": "Valglandsdel test"
          }

        }
      }]
    }
  ,
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
            "darstatus": 3,
            "oprettet": "2000-02-05T06:08:50.000",
            "ændret": "2018-07-04T18:00:00.000",
            "ikrafttrædelse": "2000-02-05T06:08:50.000",
            "nedlagt": null,
            "vejkode": "0855",
            "vejnavn": "Brammingevej",
            "vejpunkt_id": "16147a6a-af45-11e7-847e-066cff24d637",
            "vejpunkt_kilde": "Ekstern",
            "vejpunkt_nøjagtighed": "B",
            "vejpunkt_tekniskstandard": "V0",
            "vejpunkt_ændret": "2018-05-03T14:08:02.125",
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
            "regionskode": "1084",
            "regionsnavn": "Region test",
            "jordstykke_ejerlavkode": null,
            "jordstykke_matrikelnr": null,
            "jordstykke_esrejendomsnr": null,
            "jordstykke_ejerlavnavn": null,
            "højde": 31.3,
            "kvh": "04610855__18",
            "sognekode": "7776",
            "sognenavn": "Bolbro",
            "politikredskode": "0099",
            "politikredsnavn": "Politikreds test",
            "retskredskode": "0099",
            "retskredsnavn": "retskreds test",
            "afstemningsområdenummer": "12",
            "afstemningsområdenavn": "Csv-Skolen",
            "opstillingskredskode": "0099",
            "opstillingskredsnavn": "Opstillingskreds test",
            "zone": "Landzone",
            "brofast": true,
            "navngivenvej_id": "a8121066-1db3-4e0e-a7e8-75d54d8723e9",
            "menighedsrådsafstemningsområdenavn": "Bolbro",
            "menighedsrådsafstemningsområdenummer": 3,
            "storkredsnavn": "Storkreds test",
            "storkredsnummer": "1",
            "valglandsdelsbogstav": "A",
            "valglandsdelsnavn": "Valglandsdel test",
            "landsdelsnavn": "Landsdel test",
            "landsdelsnuts3": "DK014"
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
            "darstatus": 3,
            "oprettet": "2000-02-05T21:40:29.000",
            "ændret": "2018-07-04T18:00:00.000",
            "ikrafttrædelse": "2000-02-05T21:40:29.000",
            "nedlagt": null,
            "vejkode": "0347",
            "vejnavn": "Jonstrupvej",
            "adresseringsvejnavn": "Jonstrupvej",
            "vejpunkt_id": "13be931d-af45-11e7-847e-066cff24d637",
            "vejpunkt_kilde": "Ekstern",
            "vejpunkt_nøjagtighed": "B",
            "vejpunkt_tekniskstandard": "V0",
            "vejpunkt_ændret": "2018-05-03T14:08:02.125",
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
            "ejerlavkode": 60851,
            "ejerlavnavn": "Borup, Osted",
            "matrikelnr": "1a",
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
            "regionskode": "1084",
            "regionsnavn": "Region test",
            "jordstykke_ejerlavkode": 60851,
            "jordstykke_matrikelnr": "1a",
            "jordstykke_esrejendomsnr": null,
            "jordstykke_ejerlavnavn": "Borup, Osted",
            "højde": 46.4,
            "kvh": "03500347__1B",
            "sognekode": "7171",
            "sognenavn": "Osted",
            "politikredskode": "0099",
            "politikredsnavn": "Politikreds test",
            "retskredskode": "0099",
            "retskredsnavn": "retskreds test",
            "afstemningsområdenummer": "12",
            "afstemningsområdenavn": "Osted",
            "opstillingskredskode": "0099",
            "opstillingskredsnavn": "Opstillingskreds test",
            "zone": "Landzone",
            "brofast": true,
            "navngivenvej_id": "14328bc4-4870-40f6-9d07-7ed985389998",
            "menighedsrådsafstemningsområdenavn": "Osted",
            "menighedsrådsafstemningsområdenummer": 4,
            "storkredsnavn": "Storkreds test",
            "storkredsnummer": "1",
            "valglandsdelsbogstav": "A",
            "valglandsdelsnavn": "Valglandsdel test",
            "landsdelsnavn": "Landsdel test",
            "landsdelsnuts3": "DK014"
          }
        }
      }]
    }
  }
,
  adresse: {
    json: {
      mini: [{
        params: {
          id: '0a3f50b3-a112-32b8-e044-0003ba298018'
        },
        value: {
          "betegnelse": "Brammingevej 18, 1. tv, Bolbro, 5200 Odense V",
          "id": "0a3f50b3-a112-32b8-e044-0003ba298018",
          "href": "http://dawa/adresser/0a3f50b3-a112-32b8-e044-0003ba298018",
          "status": 1,
          "darstatus": 3,
          "vejkode": "0855",
          "vejnavn": "Brammingevej",
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
          "adgangsadresseid": "0a3f5089-0408-32b8-e044-0003ba298018",
          "x": 10.3314668,
          "y": 55.3948974
        }
      }],
        nestet
    :
      [{
        params: {
          id: '0a3f50b3-a112-32b8-e044-0003ba298018'
        },
        value: {
          "id": "0a3f50b3-a112-32b8-e044-0003ba298018",
          "kvhx": "04610855__18__1__tv",
          "status": 1,
          "darstatus": 3,
          "href": "http://dawa/adresser/0a3f50b3-a112-32b8-e044-0003ba298018",
          "historik": {
            "oprettet": "2000-02-05T06:08:50.000",
            "ændret": "2000-02-05T06:08:50.000",
            "nedlagt": null,
            "ikrafttrædelse": "2000-02-05T06:08:50.000"
          },
          "etage": "1",
          "dør": "tv",
          "adressebetegnelse": "Brammingevej 18, 1. tv, Bolbro, 5200 Odense V",
          "adgangsadresse": {
            "href": "http://dawa/adgangsadresser/0a3f5089-0408-32b8-e044-0003ba298018",
            "id": "0a3f5089-0408-32b8-e044-0003ba298018",
            "kvh": "04610855__18",
            "status": 1,
            "darstatus": 3,
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
            "navngivenvej": {
              "href": "http://dawa/navngivneveje/a8121066-1db3-4e0e-a7e8-75d54d8723e9",
              "id": "a8121066-1db3-4e0e-a7e8-75d54d8723e9"
            },
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
              "ændret": "2018-07-04T18:00:00.000",
              "nedlagt": null,
              "ikrafttrædelse": "2000-02-05T06:08:50.000"
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
              "tekniskstandard": "V0",
              "ændret": "2018-05-03T14:08:02.125"
            },
            "DDKN": {
              "m100": "100m_61395_5843",
              "km1": "1km_6139_584",
              "km10": "10km_613_58"
            },
            "sogn": {
              "kode": "7776",
              "navn": "Bolbro",
              "href": "http://dawa/sogne/7776"
            },
            "region": {
              "href": "http://dawa/regioner/1084",
              "kode": "1084",
              "navn": "Region test"
            },
            "landsdel": {
              "href": "http://dawa/landsdele/DK014",
              "navn": "Landsdel test",
              "nuts3": "DK014"
            },
            "retskreds": {
              "kode": "0099",
              "navn": "retskreds test",
              "href": "http://dawa/retskredse/0099"
            },
            "politikreds": {
              "kode": "0099",
              "navn": "Politikreds test",
              "href": "http://dawa/politikredse/0099"
            },
            "afstemningsområde": {
              "href": "http://dawa/afstemningsomraader/461/12",
              "navn": "Csv-Skolen",
              "nummer": "12"
            },
            "opstillingskreds": {
              "kode": "0099",
              "navn": "Opstillingskreds test",
              "href": "http://dawa/opstillingskredse/0099"
            },
            "storkreds": {
              "href": "http://dawa/storkredse/1",
              "navn": "Storkreds test",
              "nummer": "1"
            },
            "valglandsdel": {
              "bogstav": "A",
              "href": "http://dawa/valglandsdele/A",
              "navn": "Valglandsdel test"
            },
            "zone": "Landzone",
            "jordstykke": null,
            "bebyggelser": [],
            "brofast": true
          }
        }
      }]
    }
  ,
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
            "darstatus": 3,
            "oprettet": "2000-02-05T06:08:50.000",
            "ændret": "2000-02-05T06:08:50.000",
            "nedlagt": null,
            "ikrafttrædelse": "2000-02-05T06:08:50.000",
            "vejkode": "0855",
            "vejnavn": "Brammingevej",
            "vejpunkt_id": "16147a6a-af45-11e7-847e-066cff24d637",
            "vejpunkt_kilde": "Ekstern",
            "vejpunkt_nøjagtighed": "B",
            "vejpunkt_tekniskstandard": "V0",
            "vejpunkt_ændret": "2018-05-03T14:08:02.125",
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
            "adgangsadresse_darstatus": 3,
            "adgangsadresse_oprettet": "2000-02-05T06:08:50.000",
            "adgangsadresse_ændret": "2018-07-04T18:00:00.000",
            "adgangsadresse_nedlagt": null,
            "adgangsadresse_ikrafttrædelse": "2000-02-05T06:08:50.000",
            "regionskode": "1084",
            "regionsnavn": "Region test",
            "landsdelsnavn": "Landsdel test",
            "landsdelsnuts3": "DK014",
            "jordstykke_ejerlavnavn": null,
            "jordstykke_ejerlavkode": null,
            "jordstykke_matrikelnr": null,
            "jordstykke_esrejendomsnr": null,
            "højde": 31.3,
            "kvhx": "04610855__18__1__tv",
            "kvh": "04610855__18",
            "sognekode": "7776",
            "sognenavn": "Bolbro",
            "politikredskode": "0099",
            "politikredsnavn": "Politikreds test",
            "retskredskode": "0099",
            "retskredsnavn": "retskreds test",
            "afstemningsområdenummer": "12",
            "afstemningsområdenavn": "Csv-Skolen",
            "opstillingskredskode": "0099",
            "opstillingskredsnavn": "Opstillingskreds test",
            "zone": "Landzone",
            "brofast": true,
            "navngivenvej_id": "a8121066-1db3-4e0e-a7e8-75d54d8723e9",
            "menighedsrådsafstemningsområdenavn": "Bolbro",
            "menighedsrådsafstemningsområdenummer": 3,
            "storkredsnavn": "Storkreds test",
            "storkredsnummer": "1",
            "valglandsdelsbogstav": "A",
            "valglandsdelsnavn": "Valglandsdel test"
          }
        }
      }]
    }
  }
,
  navngivenvej: {
    json: {
      mini: [{
        params: {
          id: "1e260555-5c81-434f-af77-1bea6fc4c8a8"
        },
        value: {
          "administrerendekommunekode": "0420",
          "administrerendekommunenavn": "Assens",
          "adresseringsnavn": "Gl. Assensvej",
          "betegnelse": "Gl. Assensvej, Assens Kommune",
          "darstatus": "gældende",
          "href": "http://dawa/navngivneveje/1e260555-5c81-434f-af77-1bea6fc4c8a8",
          "id": "1e260555-5c81-434f-af77-1bea6fc4c8a8",
          "navn": "Gl. Assensvej",
          "visueltcenter_x": 10.09839859,
          "visueltcenter_y": 55.37194497
        }
      }],
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
            "href": "http://dawa/kommuner/0420",
            "kode": "0420",
            "navn": "Assens"
          },
          "retskrivningskontrol": "Godkendt",
          "udtaltvejnavn": "Gl. Assensvej",
          "historik": {
            "oprettet": "1900-01-01T12:00:00.000Z",
            "ændret": "1900-01-01T12:00:00.000Z",
            "ikrafttrædelse": "1900-01-01T12:00:00.000Z",
            "nedlagt": null
          },
          "vejstykker": [
            {
              "href": "http://dawa/vejstykker/0420/0480",
              "kommunekode": "0420",
              "kode": "0480",
              "id": "5ca9d513-4eae-11e8-93fd-066cff24d637",
              "darstatus": 3
            }
          ],
          postnumre: [
            {
              "href": "http://dawa/postnumre/5492",
              "navn": "Vissenbjerg",
              "nr": "5492"
            }
          ],
          "beliggenhed": {
            "oprindelse": {
              "kilde": "Ekstern",
              "tekniskstandard": "NO",
              "registrering": "2018-05-03T15:57:30.356Z",
              "nøjagtighedsklasse": "B"
            },
            "geometritype": "vejnavnelinje",
            vejtilslutningspunkter: null
          },
          "bbox": [
            10.09803611,
            55.37158289,
            10.09861676,
            55.37233702
          ],
          "visueltcenter": [
            10.09839859,
            55.37194497
          ]
        }
      }],
      flad
    :
      [{
        params: {
          id: "1e260555-5c81-434f-af77-1bea6fc4c8a8"
        },
        value: {
          "id": "1e260555-5c81-434f-af77-1bea6fc4c8a8",
          "darstatus": "gældende",
          "oprettet": "1900-01-01T12:00:00.000Z",
          "ændret": "1900-01-01T12:00:00.000Z",
          "ikrafttrædelse": "1900-01-01T12:00:00.000Z",
          "nedlagt": null,
          "navn": "Gl. Assensvej",
          "adresseringsnavn": "Gl. Assensvej",
          "administrerendekommunekode": "0420",
          "administrerendekommunenavn": "Assens",
          "retskrivningskontrol": "Godkendt",
          "udtaltvejnavn": "Gl. Assensvej",
          "beliggenhed_oprindelse_kilde": "Ekstern",
          "beliggenhed_oprindelse_nøjagtighedsklasse": "B",
          "beliggenhed_oprindelse_registrering": "2018-05-03T15:57:30.356Z",
          "beliggenhed_oprindelse_tekniskstandard": "NO",
          "beliggenhed_geometritype": "vejnavnelinje",
          "bbox_xmax": 10.09861676,
          "bbox_xmin": 10.09803611,
          "bbox_ymax": 55.37233702,
          "bbox_ymin": 55.37158289,
          "visueltcenter_x": 10.09839859,
          "visueltcenter_y": 55.37194497
        }
      }]
    }
  ,
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
          "bbox": [
            10.09803611,
            55.37158289,
            10.09861676,
            55.37233702
          ],
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
            "ikrafttrædelse": "1900-01-01T12:00:00.000Z",
            "nedlagt": null,
            "navn": "Gl. Assensvej",
            "adresseringsnavn": "Gl. Assensvej",
            "administrerendekommunekode": "0420",
            "administrerendekommunenavn": "Assens",
            "retskrivningskontrol": "Godkendt",
            "udtaltvejnavn": "Gl. Assensvej",
            "beliggenhed_oprindelse_kilde": "Ekstern",
            "beliggenhed_oprindelse_nøjagtighedsklasse": "B",
            "beliggenhed_oprindelse_registrering": "2018-05-03T15:57:30.356Z",
            "beliggenhed_oprindelse_tekniskstandard": "NO",
            "beliggenhed_geometritype": "vejnavnelinje",
            "visueltcenter_x": 10.09839859,
            "visueltcenter_y": 55.37194497

          }
        }

      }]
    }
  }
}
  ;

  const propertiesToIgnoreMap = {
    region: {
      json: {
        nestet: {'geo_ændret': true, 'ændret': true},
        flad: {'geo_ændret': true, 'ændret': true}
      }
    },
    landsdel: {
      json: {
        nestet: {'geo_ændret': true, 'ændret': true},
        flad: {'geo_ændret': true, 'ændret': true}
      }
    },
    kommune: {
      json: {
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    jordstykke: {
      json: {
        flad: {'geo_ændret': true, 'ændret': true},
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    menighedsrådsafstemningsområde: {
      json: {
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    afstemningsområde: {
      json: {
        flad: {'geo_ændret': true, 'ændret': true},
        nestet: {'geo_ændret': true, 'ændret': true}
      },
      geojson: {
        nestet: {
          properties: {
            'geo_ændret': true, 'ændret': true
          }
        }
      }
    },
    opstillingskreds: {
      json: {
        flad: {'geo_ændret': true, 'ændret': true},
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    storkreds: {
      json: {
        flad: {'geo_ændret': true, 'ændret': true},
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    valglandsdel: {
      json: {
        flad: {'geo_ændret': true, 'ændret': true},
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    supplerendebynavn: {
      json: {
        flad: {'geo_ændret': true, 'ændret': true},
        nestet: {'geo_ændret': true, 'ændret': true}
      }
    },
    stednavn: {
      geojson: {
        flad: {properties: {'sted_geo_ændret': true, 'sted_ændret': true}}
      }
    }
  };

  const removeIgnoredProperties = (object, testValue, propertiesToIgnore) => {
    for (let property of Object.keys(propertiesToIgnore)) {
      assert(object.hasOwnProperty(property));
      if (_.isObject(propertiesToIgnore[property])) {
        removeIgnoredProperties(object[property], testValue[property], propertiesToIgnore[property]);
      }
      else {
        delete object[property];
        delete testValue[property];
      }
    }
  }

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
              const queryParams = Object.assign({}, {format, struktur}, test.queryParams || {});
              const jsonResult = yield helpers.getJson(clientFn(), resource, test.params, queryParams);
              if (propertiesToIgnoreMap[entityName] && propertiesToIgnoreMap[entityName][format] && propertiesToIgnoreMap[entityName][format][struktur]) {
                const propertiesToIgnore = propertiesToIgnoreMap[entityName][format][struktur];
                removeIgnoredProperties(jsonResult, test.value, propertiesToIgnore);
              }
              expect(jsonResult).to.deep.equal(test.value);
            }
          }))
        }
      }
    }
  });

});
