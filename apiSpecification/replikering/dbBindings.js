const {kode4String, d: timestampFormatter, numberToString} = require('../util');
const {formatHusnr} = require('../husnrUtil');
const datamodels = require("./datamodel");
const {selectIsoDate: selectLocalDateTime, selectIsoDateUtc: selectIsoTimestampUtc} = require('../common/sql/sqlUtil');
const temaModels = require('../../dagiImport/temaModels');

const normalizeAttr = (attrName, bindingAttr) =>
  Object.assign(
    {
      column: attrName,
      formatter: v => v,
      selectTransform: col => col
    },
    bindingAttr || {});

const normalize = (datamodels, unnormalizedBindings) =>
  Object.keys(datamodels).reduce((memo, entityName) => {
    const datamodel = datamodels[entityName];
    const binding = unnormalizedBindings[entityName];
    if (!binding) {
      throw new Error('No db replication binding for ' + entityName);
    }
    const normalizedAttributes = datamodel.attributes.reduce((memo, modelAttr) => {
      memo[modelAttr.name] = normalizeAttr(modelAttr.name, binding.attributes[modelAttr.name]);
      return memo;
    }, {});
    const normalizedBinding = Object.assign({}, binding, {attributes: normalizedAttributes});
    memo[entityName] = normalizedBinding;
    return memo;
  }, {});

const unnormalizedBindings = {
  adgangsadresse: {
    table: 'adgangsadresser',
    attributes: {
      status: {
        column: 'objekttype'
      },
      kilde: {
        column: 'adgangspunktkilde'
      },
      oprettet: {
        formatter: timestampFormatter,
        selectTransform: selectLocalDateTime
      },
      ændret: {
        column: 'aendret',
        selectTransform: selectLocalDateTime,
        formatter: timestampFormatter
      },
      ikrafttrædelsesdato: {
        column: 'ikraftfra',
        selectTransform: selectLocalDateTime,
        formatter: timestampFormatter
      },
      kommunekode: {
        formatter: kode4String
      },
      vejkode: {
        formatter: kode4String
      },
      husnr: {
        formatter: formatHusnr
      },
      postnr: {
        formatter: kode4String
      },
      etrs89koordinat_øst: {
        column: 'etrs89oest'
      },
      etrs89koordinat_nord: {
        column: 'etrs89nord',
      },
      esrejendomsnr: {
        formatter: numberToString
      },
      nøjagtighed: {
        column: 'noejagtighed'
      },
      adressepunktændringsdato: {
        formatter: timestampFormatter,
        column: 'adressepunktaendringsdato',
        selectTransform: selectLocalDateTime
      },
      højde: {
        column: 'hoejde'
      }
    }
  },
  adresse: {
    table: 'enhedsadresser',
    attributes: {
      status: {
        column: 'objekttype'
      },
      oprettet: {
        formatter: timestampFormatter,
        selectTransform: selectLocalDateTime
      },
      ændret: {
        column: 'aendret',
        formatter: timestampFormatter,
        selectTransform: selectLocalDateTime
      },
      dør: {
        column: 'doer'
      },
      ikrafttrædelsesdato: {
        formatter: timestampFormatter,
        column: 'ikraftfra',
        selectTransform: selectLocalDateTime
      },
    }
  },
  ejerlav: {
    table: 'ejerlav',
    attributes: {}
  },
  jordstykketilknytning: {
    table: 'jordstykker_adgadr',
    attributes: {
      adgangsadresseid: {
        column: 'adgangsadresse_id'
      }
    }
  },
  navngivenvej: {
    table: 'navngivenvej',
    attributes: {
      oprettet: {
        formatter: timestampFormatter,
        selectTransform: selectIsoTimestampUtc
      },
      ændret: {
        formatter: timestampFormatter,
        selectTransform: selectLocalDateTime
      }
    }
  },
  stednavntilknytning: {
    table: 'stednavne_adgadr',
    attributes: {}
  },
  vejstykke: {
    table: 'vejstykker',
    attributes: {
      kommunekode: {
        formatter: kode4String,
      },
      kode: {
        formatter: kode4String
      },
      navn: {
        column: 'vejnavn'

      },
      oprettet: {
        formatter: timestampFormatter,
        selectTransform: selectLocalDateTime
      },
      ændret: {
        column: 'aendret',
        formatter: timestampFormatter,
        selectTransform: selectLocalDateTime
      },
    }
  },
  vejstykkepostnummerrelation: {
    table: 'vejstykkerpostnumremat',
    attributes: {
      kommunekode: {
        formatter: kode4String
      },
      vejkode: {
        formatter: kode4String
      },
      postnr: {
        formatter: kode4String,
      }
    }
  },
  postnummer: {
    table: 'postnumre',
    attributes: {
      nr: {
        formatter: kode4String
      }
    }
  },
};

for (let temaModel of temaModels.modelList) {
  unnormalizedBindings[temaModel.tilknytningName] = temaModels.toReplikeringTilknytningDbBinding(temaModel);
}

module.exports = normalize(datamodels, unnormalizedBindings);