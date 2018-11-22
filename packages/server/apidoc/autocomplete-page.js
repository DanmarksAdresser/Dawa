module.exports = {
  entity: 'autocomplete',
  heading: 'Autocomplete',
  lead: `Autocomplete API'et - En kombineret autocomplete funktionalitet.`,
  body: `<p>DAWA tilbyder autocomplete til indtastning af vejnavne, adgangsadresser og adresser, 
som det kan læses i deres respektive API beskrivelser. For at implemente en optimal indtastning af 
adresser med autocomplete skal de tre autocomplete funktionaliteter kombineres. Når brugeren taster 
de første tegn autocompletes på vejnavne. Når vejnavnet er fundet autocompletes på adgangsadresser. 
Når adgangsadressen er fundet autocompletes på adresser. I applikationen, som skal anvende 
adresseindtastning med autocomplete, kan denne logik implementeres ved at kombinere de tre autocomplete typer.
</p> 
<p>En enklere og lettere måde at implementere indtastning af adresser med autocomplete er at
 anvende Autocomplete API’et beskrevet på denne side. Autocomplete API'et håndterer trinnene i
  adresse autocomplete: Først vejnavne, så adgangsadresser og endelig adresser. 
  API'et kan anvendes i alle applikationstyper, web, mobil, desktop og server. 
  Hvis det er en web applikation, hvori man ønsker at implementere adresse indtastning 
  med autocomplete, kan det gøres endnu lettere - nemlig ved at anvende 
  <a href="//autocomplete.aws.dk">Autocomplete komponenten</a>, 
  som selvfølgelig er baseret på Autocomplete API'et.</p>`,
  sections: [
    {
      type: 'endpoint',
      heading: 'Autocomplete',
      anchor: 'autocomplete',
      path: '/autocomplete'
    },
    {
      type: 'datadescription',
      heading: 'Beskrivelse af autocomplete-svar',
      anchor: 'autocomplete-svar',
      entity: 'autocomplete',
      qualifier: 'autocomplete'
    }
  ]
};
