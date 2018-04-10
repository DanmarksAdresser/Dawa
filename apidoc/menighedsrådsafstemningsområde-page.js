module.exports = {
  entity: 'menighedsrådsafstemningsområde',
  heading: 'Afstemningsområder',
  lead: `API'et udstiller alle Danmarks menighedsrådsafstemningsområder.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Menighedsrådsafstemningsområdesøgning',
      anchor: 'søgning',
      path: '/menighedsraadsafstemningsomraader'
    },
    {
      type: 'endpoint',
      heading: 'Menighedsrådsafstemningsområdeopslag',
      anchor: 'opslag',
      path: '/menighedsraadsafstemningsomraader/{kommunekode}/{nummer}'
    },
    {
      type: 'endpoint',
      heading: 'Menighedsrådsafstemningsområde autocomplete',
      anchor: 'autocomplete',
      path: '/menighedsraadsafstemningsomraader/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Menighedsrådsafstemningsområder reverse geocoding',
      anchor: 'reverse',
      path: '/menighedsraadsafstemningsomraader/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af menighedsrådsafstemningsområdedata',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert menighedsrådsafstemningsområde følgende informationer:`,
      entity: 'menighedsrådsafstemningsområde',
      qualifier: 'json'
    }
  ]
};
