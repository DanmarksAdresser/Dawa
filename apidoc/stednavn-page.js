 module.exports = {
  entity: 'stednavn',
  heading: 'Stednavne (forældet)',
  lead: `API'et udstiller Danmarks stednavne samt tilhørende funktionalitet.`,
  body: `<p>Stednavne omfatter bl.a. bebyggelser (byer og bydele), bygninger som eksempelvis skoler og idrætsanlæg,
samt landskaber som skove, strande og øer.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Stednavnsøgning',
      anchor: 'søgning',
      path: '/stednavne'
    },
    {
      type: 'endpoint',
      heading: 'Stednavnopslag',
      anchor: 'opslag',
      path: '/stednavne/{id}'
    },
    {
      type: 'endpoint',
      heading: 'Stednavn autocomplete',
      anchor: 'autocomplete',
      path: '/stednavne/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af stednavne',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert stednavn følgende informationer:`,
      entity: 'stednavn-legacy',
      qualifier: 'json'
    }
  ]
};
