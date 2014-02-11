CREATE DATABASE dawatest ENCODING 'UTF-8' LC_COLLATE 'da_DK' LC_CTYPE 'da_DK' TEMPLATE template0;
ALTER DATABASE dawatest SET cursor_tuple_fraction = 0.001;
\c dawatest;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;