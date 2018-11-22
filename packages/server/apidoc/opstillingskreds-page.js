module.exports = {
  entity: 'opstillingskreds',
  heading: 'Opstillingskredse',
  lead: `API'et udstiller alle Danmarks opstillingskredse.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Opstilingskreds søgning',
      anchor: 'søgning',
      path: '/opstillingskredse'
    },
    {
      type: 'endpoint',
      heading: 'Opstilingskreds opslag',
      anchor: 'opslag',
      path: '/opstillingskredse/{kode}'
    },
    {
      type: 'endpoint',
      heading: 'Opstillingskreds autocomplete',
      anchor: 'autocomplete',
      path: '/opstillingskredse/autocomplete'
    },
    {
      type: 'endpoint',
      heading: 'Opstillingskreds reverse geocoding',
      anchor: 'reverse',
      path: '/opstillingskredse/reverse'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af opstillingskredse',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hver opstillingskreds følgende informationer:`,
      entity: 'opstillingskreds',
      qualifier: 'json'
    }
  ]
};
