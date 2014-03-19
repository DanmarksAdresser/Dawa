
\set ON_ERROR_STOP on
\set ECHO queries

CREATE DATABASE dawa ENCODING 'UTF-8' LC_COLLATE 'da_DK.UTF-8' LC_CTYPE 'da_DK.UTF-8' TEMPLATE template0;
ALTER DATABASE dawa SET cursor_tuple_fraction = 0.001;
ALTER DATABASE dawa SET random_page_cost = 1.1;
ALTER DATABASE dawa SET effective_cache_size='7GB';

\c dawa;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
