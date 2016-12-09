const chars = 'abcdefghijklmnopqrstuvwxyzæøåé';

function randomString(length) {
  length = length ? length : 32;

  var string = '';

  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    string += chars.substring(randomNumber, randomNumber + 1);
  }

  return string;
}

module.exports = [{
  name: 'adresseudtræk',
  type: 'fixedConcurrency',
  url: '/adresser',
  concurrency: 4,
  rampUpDelay: 5000,
}, {
  name: 'autocomplete',
  type: 'fixedRps',
  url: () => '/autocomplete?q=' + randomString(3),
  initial: 1,
  increase: 1,
  max: 10,
  increasePeriod: 1000,
  increaseDelay: 10000
}];
