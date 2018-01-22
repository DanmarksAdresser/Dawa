module.exports = {
  entity: 'vejnavn',
  heading: 'Vejnavne',
  lead: `API'et udstiller Danmarks vejnavne samt tilhørende funktionalitet.`,
  body: `<p>Dette API udstiller unikke vejnavne, f.eks. til brug for autocomplete. Mange forskellige
 fysiske veje kan have det samme vejnavn. For at finde fysiske veje benyttes i stedet
 <a href="vejstykke">vejstykke-API'et</a>.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Vejnavnsøgning',
      anchor: 'søgning',
      path: '/vejnavne'
    },
    {
      type: 'endpoint',
      heading: 'Vejnavnopslag',
      anchor: 'opslag',
      path: '/vejnavne/{navn}'
    },
    {
      type: 'endpoint',
      heading: 'Vejnavn autocomplete',
      anchor: 'autocomplete',
      path: '/vejnavne/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af vejnavne',
      anchor: 'databeskrivelse',
      lead: `API'et udstiller for hvert vejnavn følgende informationer:`,
      entity: 'vejnavn',
      qualifier: 'json'
    }
  ]
};
