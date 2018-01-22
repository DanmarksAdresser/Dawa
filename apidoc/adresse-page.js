module.exports = {
  entity: 'adresse',
  heading: 'Adresse-API',
  lead: `Adresse-API'et udstiller Danmarks adresser samt tilhørende funktionalitet.`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Adressesøgning',
      anchor: 'søgning',
      path: '/adresser'
    },
    {
      type: 'endpoint',
      heading: 'Adresseopslag',
      anchor: 'opslag',
      path: '/adresser/{id}'
    },
    {
      type: 'endpoint',
      heading: 'Adresse autocomplete',
      anchor: 'autocomplete',
      path: '/adresser/autocomplete',
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af adressedata',
      anchor: 'databeskrivelse',
      lead: `<p>En <em>adresse</em> er en struktureret betegnelse som angiver en særskilt adgang til et areal, en bygning eller en del af en bygning efter reglerne i adressebekendtgørelsen.</p> 
            <p>En adresse angiver en særskilt adgang til et areal, en bygning eller en del af en bygning, efter reglerne i adressebekendtgørelsen. En adresse fastsættes for at angive en bestemt adgang til:</p> 
            <ul>
              <li>et areal,  fx. en byggegrund, et grønt område eller en sportsplads</li> 
              <li> en bygning, herunder et andet bygværk, f.eks. et teknisk anlæg</li> 
              <li> en del af en bygning, fx en etage eller en bolig- eller erhvervs¬enhed i en bygning</li> 
            </ul>  
            <p>Forskellen på en adresse og en adgangsadresse er at adressen rummer eventuel etage- og/eller dørbetegnelse. Det gør adgangsadressen ikke.</p>
            <p>p Web API'et udstiller for hver adresse følgende informationer:</p>
            `,
      entity: 'adresse',
      qualifier: 'json'
    },
    {
      type: 'endpoint',
      heading: 'Adresse datavask',
      anchor: 'datavask',
      path: '/datavask/adresser',
      sections: [
        {
          type: 'datadescription',
          heading: 'Datavask svar',
          lead: '<p>Ved anvendelse af datavask-APIet modtages følgende svarstruktur:</p>',
          entity: 'adresse_datavask',
          qualifier: 'json'
        }
      ]
    },
    {
      type: 'endpoint',
      anchor: 'historik',
      heading: 'Adresse historik',
      path: '/historik/adresser'
    },
    {
      type: 'endpoint',
      anchor: 'udtræk',
      heading: 'Adresse - udtræk',
      path: '/replikering/adresser'
    },
    {
      type: 'endpoint',
      anchor: 'hændelser',
      heading: 'Adresse - hændelser',
      path: '/replikering/adresser/haendelser'
    }
  ]
};
