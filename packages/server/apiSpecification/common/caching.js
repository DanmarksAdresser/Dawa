const defaultCacheStrategy = (maxAge) => (cacheParam, httpStatus) => {
  if(httpStatus >= 300 || cacheParam === 'no-cache') {
    return 'no-cache';
  }
  return `max-age=${maxAge}`;
};

const noCacheStrategy = () => 'no-store';

module.exports = {
  defaultCacheStrategy,
  noCacheStrategy
}