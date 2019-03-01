#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER dbuser;
    ALTER USER dbuser WITH SUPERUSER;
    CREATE DATABASE dawaempty ENCODING 'UTF-8' LC_COLLATE 'da_DK.UTF-8' LC_CTYPE 'da_DK.UTF-8' TEMPLATE template0;
    CREATE DATABASE dawatest ENCODING 'UTF-8' LC_COLLATE 'da_DK.UTF-8' LC_CTYPE 'da_DK.UTF-8' TEMPLATE template0;
    CREATE DATABASE replikeringtest ENCODING 'UTF-8' LC_COLLATE 'da_DK.UTF-8' LC_CTYPE 'da_DK.UTF-8' TEMPLATE template0;
    GRANT ALL PRIVILEGES ON DATABASE dawaempty TO dbuser;
    GRANT ALL PRIVILEGES ON DATABASE dawatest TO dbuser;
    GRANT ALL PRIVILEGES ON DATABASE replikeringtest TO dbuser;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname dawatest < /initialize-db.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname dawaempty < /initialize-db.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname replikeringtest < /initialize-db.sql