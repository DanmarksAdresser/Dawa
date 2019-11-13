const {
    autocompleteSubtext,
    formatAndPagingParams,
    overwriteWithAutocompleteQParameter,
    strukturParameter,
    autocompleteParameter
} = require('./common');

const idParameters = [
    {
        name: 'postnr',
        doc: 'Postnummeret. 4 cifre. Eksempel: 8000 for Aarhus C.'
    },
    {
        name: 'vejnavn',
        doc: 'Vejnavnet. Der skal være tale om et eksakt match, dvs. hvor store/små bogstaver, punktuering, accenter og mellemrum matcher præcist.'
    }
];

const queryParameters = [
    {
        name: 'q',
        doc: 'Søgetekst. Der søges i hele betegnelsen. Alle ord i søgeteksten skal matche. ' +
            'Wildcard * er tilladt i slutningen af hvert ord. ' +
            'Der skelnes ikke mellem store og små bogstaver.'
    },
    autocompleteParameter,
    {
        name: 'fuzzy',
        doc: 'Aktiver fuzzy søgning'
    },
    ...idParameters,
    {
        name: 'polygon',
        doc: 'Find de vejnavnpostnummerrelationer, som overlapper med det angivne polygon. ' +
            'Polygonet specificeres som et array af koordinater på samme måde som' +
            ' koordinaterne specificeres i GeoJSON\'s <a href="http://geojson.org/geojson-spec.html#polygon">polygon</a>.' +
            ' Bemærk at polygoner skal' +
            ' være lukkede, dvs. at første og sidste koordinat skal være identisk.<br>' +
            ' Som koordinatsystem kan anvendes ETRS89/UTM32 eller  WGS84/geografisk. Dette' +
            ' angives vha. srid parameteren, se ovenover.<br> Eksempel: ' +
            ' polygon=[[[10.3,55.3],[10.4,55.3],[10.4,55.31],[10.4,55.31],[10.3,55.3]]].',
        examples: []
    },
    {
        name: 'cirkel',
        doc: 'Find de vejnavnpostnummerrelationer, som overlapper med den cirkel angivet af koordinatet (x,y) og radius r. Som koordinatsystem kan anvendes (ETRS89/UTM32 eller) WGS84/geografisk. Radius angives i meter. cirkel={x},{y},{r}.',
        examples: []
    },
    {
        name: 'x',
        doc: 'Find vejnavnpostnummerrelationen nærmest det angivne koordinat. Anvendes sammen med y-parameteren.'
    },
    {
        name: 'y',
        doc: 'Find vejnavnpostnummerrelationen nærmest det angivne koordinat. Anvendes sammen med x-parameteren.'
    }
];


module.exports = [
    {
        entity: 'vejnavnpostnummerrelation',
        path: '/vejnavnpostnummerrelationer',
        subtext: 'Søger efter vejnavnpostnummerrelationer.',
        parameters: queryParameters.concat(formatAndPagingParams).concat([strukturParameter]),
        examples: []
    },
    {
        entity: 'vejnavnpostnummerrelation',
        path: '/vejnavnpostnummerrelationer/{postnr}/{vejnavn}',
        subtext: 'Opslag på enkelt vejnavnpostnummerrelation',
        parameters: [...idParameters, strukturParameter],
        nomulti: true,
        examples: []
    },
    {
        entity: 'vejstykke',
        path: '/vejnavnpostnummerrelationer/autocomplete',
        subtext: autocompleteSubtext('vejnavnpostnummerrelation'),
        parameters: overwriteWithAutocompleteQParameter(queryParameters).concat(formatAndPagingParams),
        examples: []
    }
];
