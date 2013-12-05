console.log('utility modul');

var util= require("util");

exports.getFormat= function (type) {
  if (type === undefined) type= 'json';
  type= type.toLocaleLowerCase();
  return (type === 'csv' || type === 'json'|| type === 'geojson' || type === 'html')?type:undefined;
}


exports.paginering= function(query) {
  var result= {};
  if (query.side && query.per_side) {
    result.status= 1;
    result.side= parseInt(query.side, 10);
    result.per_side= parseInt(query.per_side, 10);
    result.skip=  (result.side-1)*result.per_side;
    result.limit= result.per_side;
  }
  else if (query.side || query.per_side){
    result.status= 2;
  }
  else {
    result.status= 0;
  }
  return result;
}

exports.wildcard= function(s) {
  if (s.indexOf('*') !== -1) {
    if (s.charAt(0) !== '*') {
      s = '^' + s; // + '$';
    }
    if (s.charAt(s.length - 1) !== '*') {
      s = s + '$';
    }
    return new RegExp(s.replace(/\*/g, '(.*)'), 'i')
  }
  return s;
}

exports.spells= function (query) {
  console.log('spells pre: '+query.toLocaleLowerCase().trim());
  if (query.indexOf('ø') !== -1) {
    query= query.replace(new RegExp('ø', 'g'),'(ø|oe)');
  }
  else
    query= query.replace(new RegExp('oe', 'g'),'(ø|oe)');
  if (query.indexOf('æ') !== -1) {
    query= query.replace(new RegExp('æ', 'g'),'(æ|ae)');
  }
  else
    query= query.replace(new RegExp('ae', 'g'),'(æ|ae)');
  if (query.indexOf('å') !== -1) {
    query= query.replace(new RegExp('å', 'g'),'(å|aa)');
  }
  else
    query= query.replace(new RegExp('aa', 'g'),'(å|aa)');
  query= query.replace(new RegExp(' ', 'g'),'( ?)');
  query= query.replace(new RegExp('\\.', 'g'),'(\\.| |\\. )');
  if (query.indexOf('gl') !== -1) {
    query= query.replace('gl','(gl|gammel)');
  }
  else {
    query= query.replace('gammel','(gl|gammel)');
  }
  if (query.indexOf('alle') !== -1) {
    query= query.replace('alle','(alle|allé)');
  }
  else {
    query= query.replace('allé','(alle|allé)');
  }
  console.log('spells post: '+query.toLocaleLowerCase().trim());
  return new RegExp('^'+ query.toLocaleLowerCase().trim() ,'i');
}