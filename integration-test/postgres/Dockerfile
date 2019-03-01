FROM mdillon/postgis:11-alpine

COPY docker-entrypoint-initdb.d/* /docker-entrypoint-initdb.d/
COPY initialize-db.sql .