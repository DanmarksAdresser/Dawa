module.exports = {
  entity: 'stednavn2',
  heading: 'Stednavne',
  lead: `API'et udstiller stednavne fra stednavneregisteret.`,
  body: `<p>Stednavne navngiver <a href="/dok/api/sted">steder.</a>. Hvert sted har et
primært og 0 eller flere sekundære navne. Ved søgning i stednavne kan der således
returneres mere end ét navn pr. sted.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Stednavnsøgning',
      anchor: 'søgning',
      path: '/stednavne2'
    },
    {
      type: 'endpoint',
      heading: 'Stednavnopslag',
      anchor: 'opslag',
      path: '/stednavne2/{sted_id}/{navn}'
    },
    {
      type: 'endpoint',
      heading: 'Stednavn autocomplete',
      anchor: 'autocomplete',
      path: '/stednavne2/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af stednavne',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert stednavn følgende informationer:`,
      entity: 'stednavn',
      qualifier: 'json'
    }
  ]
};
