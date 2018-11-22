module.exports = {
  entity: 'stednavn2',
  heading: 'Stednavne',
  lead: `API'et udstiller stednavne fra stednavneregisteret.`,
  body: `
<p>Stednavne navngiver <a href="/dok/api/sted">steder</a>. Hvert sted har et
primært og 0 eller flere sekundære navne. Ved søgning i stednavne kan der således
returneres mere end ét navn pr. sted.</p>
<p>Dette er version 2 af stednavne-API'et. I denne version af API'et udstilles stednavne og steder
separat, da hvert sted kan have flere navne tilknyttet.</p>
<p>Det er primært ved søgning ud fra navn, at det giver mening at anvende stednavne-API'et.
Såfremt søgning sker ud fra andre egenskaber, så som type eller geografi, er det mere hensigtsmæssigt at anvende <a href="/dok/api/sted">sted-API'et</a>.
Årsagen er, at ved søgning ud fra andre egenskaber end navne er det ikke hensigtsmæssigt at steder kan optræde mere end én gang
i søgeresultatet.</p>`,
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
