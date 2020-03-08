module.exports = {
  entity: 'landsdel',
  heading: 'Landsdele',
  lead: `<p>API'et udstiller Danmarks NUTS landsdele samt tilhørende funktionalitet. <a href="https://da.wikipedia.org/wiki/NUTS">NUTS</a> er en administrativ inddeling, som anvendes til statistik. Danmarks NUTS hierarki består af flere inddelinger: Regioner (NUTS 2), landsdele (NUTS 3), kommuner (LAU 1) og sogne (LAU 2).</p> 

<p>Der er følgende NUTS landsdele i Danmark: <a href="https://info.aws.dk/landsdele">https://info.aws.dk/landsdele</a></p>

<p>DAWA udstiller andre typer landsdele. Indenfor valgtemaet udstilles valglandsdele, som bl.a. anvendes ved fordeling af tillægsmandater. Stednavne har undertypen landsdel. Valglandsdele og landsdelene fra stednavne er forskellig fra NUTS landsdelene.</p>

<p>Adgangsadresserne er nu forsynet med information om, hvilken landsdel de er placeret i. Der er endvidere mulighed for at fremsøge en landsdels adresser. Det kan du læse mere om <a href="/dok/api/adgangsadresse">her</a>.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Landsdelssøgning',
      anchor: 'søgning',
      path: '/landsdele'
    },
    {
      type: 'endpoint',
      heading: 'Landsdelsopslag',
      anchor: 'opslag',
      path: '/landsdele/{nuts3}'
    },
    {
      type: 'endpoint',
      heading: 'Landsdele autocomplete',
      anchor: 'autocomplete',
      path: '/landsdele/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af landsdele',
      anchor: 'databeskrivelse',
      lead: `<p>Ovenstående Web API udstiller landsdele, eksempelvis "Østjylland".</p>
<p>API'et udstiller for hver supplerende bynavn følgende informationer:</p>`,
      entity: 'landsdel',
      qualifier: 'json'
    }
  ]
};
