module.exports =  (user, password, host, port, database) =>
  `postgres://${user ? user : ''}${password ? `:${password}` : ''}${user ? '@' : ''}${host}:${port}/${database}`;
