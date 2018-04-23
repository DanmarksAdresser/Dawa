module.exports = {
  entity: 'sted',
  heading: 'Steder',
  lead: `API'et udstiller stederne fra Danmarks officielle stednavneregister. `,
  body: `<p>Steder omfatter bl.a. bebyggelser (byer og bydele), bygninger som eksempelvis skoler og idrætsanlæg,
samt landskaber som skove, strande og øer.
Et sted har et primært navn, men kan også have 1 eller flere sekundære navne. <a href="/dok/api/stednavn">Stednavne-API'et</a> anvendes
ved søgning på stedets navn.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Stedsøgning',
      anchor: 'søgning',
      path: '/steder'
    },
    {
      type: 'endpoint',
      heading: 'Stedopslag',
      anchor: 'opslag',
      path: '/steder/{id}'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af steder',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert sted følgende informationer:`,
      entity: 'sted',
      qualifier: 'json'
    }
  ]
};
