module.exports = {
    entity: 'vejnavnpostnummerrelation',
    heading: 'Vejnavnpostnummerrelationer',
    lead: `API'et udstiller alle unikke kombinationer af vejnavn og postnummer, eksempelvis "Rentemestervej, 2400 København NV"`,
    body: `<p>Det primære formål med API'et er at kunne fremsøge veje ud fra en kombination af vejnavn og postnummer.</p>`,
    sections: [
        {
            type: 'endpoint',
            heading: 'Vejnavnpostnummerrelation søgning',
            anchor: 'søgning',
            path: '/vejnavnpostnummerrelationer'
        },
        {
            type: 'endpoint',
            heading: 'Vejnavnpostnummerrelation enkeltopslag',
            anchor: 'opslag',
            path: '/vejnavnpostnummerrelationer/{postnr}/{vejnavn}'
        },
        {
            type: 'endpoint',
            heading: 'Vejnavnpostnummerrelation autocomplete',
            anchor: 'autocomplete',
            path: '/vejnavnpostnummerrelationer/autocomplete'
        },
        {
            type: 'datadescription',
            heading: 'Beskrivelse af vejnavnpostnummerrelation',
            anchor: 'databeskrivelse',
            lead: `API'et udstiller for hver vejnavnpostnummerrelation følgende informationer:`,
            entity: 'vejnavnpostnummerrelation',
            qualifier: 'json'
        }
    ]
};
