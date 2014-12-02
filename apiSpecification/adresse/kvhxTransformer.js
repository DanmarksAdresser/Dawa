"use strict";

var kvhTransformer = require('../adgangsadresse/kvhTransformer');
var pad = require('../util.js').padUnderscore;

exports.format = function(rs) {
  return kvhTransformer.format(rs) +
         pad(rs.etage, 3) +
         pad(rs.dør, 4);
};

exports.kvhxFieldsDts = kvhTransformer.kvhFieldsDts +
'<dt>Index 12-14: Etage</dt><dd>Adressens etage. Hvis etageangivelsen fylder mindre end 3 tegn, foranstilles med underscore, ‘st’ repræsenteres altså som "_st"</dd>' +
'<dt>Index 15-18: Dør</dt><dd>Angivelse af dør. Hvis dørbetegnelsen fylder mindre end 3 tegn, foranstilles med underscore, 2 repræsenteres altså som "___2"';
