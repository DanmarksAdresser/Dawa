const conf = require('@dawadk/common/src/config/holder').getConfig();

const getMaxAgeForPath = path => {
  const cacheConf = conf.get('caching');
  const overrides = cacheConf.max_age_overrides;
  for(let {regex, max_age} of overrides) {
    if(new RegExp(regex).test(path)) {
      return max_age;
    }
  }
  return cacheConf.max_age;
};

/**
 * Generic caching middleware. Used for docs only.
 */
function cachingMiddleware(req, res, next) {
  // this looks like a mess, but we cannot set the caching headers before we
  // know the response code
  var baseFunc = res.writeHead;
  res.writeHead = function(statusCode, reasonPhrase, headers) {
    var header;
    if(statusCode >= 300 || req.query.cache === 'no-cache') {
      header = 'no-cache';
    }
    else {
      header = `max-age=${getMaxAgeForPath(req.path)}`;
    }
    res.setHeader('Cache-Control', header);
    if(headers) {
      headers['Cache-Control'] = header;
    }
    if(!headers && reasonPhrase) {
      reasonPhrase['Cache-Control'] = header;
    }
    baseFunc.call(res, statusCode, reasonPhrase, headers);
  };
  next();
}

module.exports = {
  cachingMiddleware, getMaxAgeForPath
};