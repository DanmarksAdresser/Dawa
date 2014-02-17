CREATE DATABASE dawa ENCODING 'UTF-8' LC_COLLATE 'da_DK.UTF-8' LC_CTYPE 'da_DK.UTF-8' TEMPLATE template0;
ALTER DATABASE dawa SET cursor_tuple_fraction = 0.001;
\c dawa;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
