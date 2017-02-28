module.exports = [{
  name: 'adresseudtræk',
  type: 'fixedConcurrency',
  url: '/adresser',
  concurrency: 50,
  clientCount: 50,
  rampUpDelay: 100,
}];
