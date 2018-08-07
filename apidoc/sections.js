module.exports = [{
  name: 'Adresser',
  headingClass: 'h2-icon h2-adresser',
  lead: 'For en generel introduktion til adresseområdet, se <a href="/dok/adresser">her<a/>.',
  entities: ['adgangsadresse', 'adresse', 'autocomplete', 'navngivenvej', 'vejstykke', 'vejnavn', 'supplerendebynavn', 'supplerendebynavn2', 'postnummer'],
}, {
  name: 'DAGI',
  headingClass: 'h2-icon h2-dagi',
  lead: 'For en generel introduktion til DAGI, se <a href="/dok/dagi">her<a/>.',
  entities: ['afstemningsområde', 'kommune', 'menighedsrådsafstemningsområde','opstillingskreds', 'politikreds', 'postnummer', 'region', 'retskreds', 'sogn', 'storkreds', 'valglandsdel']
}, {
  name: 'Matrikelkortet',
  headingClass: 'h2-icon h2-matrikel',
  lead: 'For en generel introduktion til matrikelkortet, se <a href="/dok/matrikelkortet">her<a/>.',
  entities: ['ejerlav', 'jordstykke']
}, {
  name: 'BBR',
  headingClass: 'h2-icon h2-bbr',
  lead: 'For en generel introduktion til BBR, se <a href="/dok/bbr">her<a/>.',
  entities: ['BBR grund', 'BBR bygning', 'BBR enhed', 'BBR etage', 'BBR tekniskanlaeg', 'BBR ejerskab', 'BBR kommune', 'BBR opgang', 'BBR bygningspunkt', 'BBR matrikelreference'],
}, {
  name: 'Stednavne',
  headingClass: 'h2-icon h2-sted',
  lead: 'For en generel introduktion til stednavne, se <a href="/dok/stednavne">her<a/>.',
  entities: ['sted', 'stednavn', 'stednavn2', 'stednavntype', 'bebyggelse']
},
  {
    name: 'Replikering',
    headingClass: 'h2-icon',
    lead: `Replikerings-API'et gør det muligt at etablere og vedligeholde en lokal kopi af de data som DAWA udstiller.
 <a href="/dok/guide/replikering">Replikerings-guiden</a> anviser hvordan API'et benyttes.`,
    entities: ['replikering', 'replikering-legacy']
  }];
