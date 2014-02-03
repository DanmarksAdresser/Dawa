Danmarks Adressers Web API - DAWA [![Build Status](https://travis-ci.org/DanmarksAdresser/Dawa.png?branch=master)](https://travis-ci.org/DanmarksAdresser/Dawa)
======

Et web API til at udstille Danmarks adresser.

Kørende eksempel
=======

Se [DAWA](http://dawa.aws.dk)


install
=======

### Install mongodb, nodejs, PostgreSQL og npm

##### On Ubuntu 12.04
```
 $> sudo apt-get install mongodb
 $> sudo apt-get install python-software-properties python g++ make
 $> sudo add-apt-repository ppa:chris-lea/node.js # needed for Ubuntu 12.04, which doesn't have the newest npm
 $> sudo apt-get update
 $> sudo apt-get install nodejs
 $> sudo apt-get install npm
 $> sudo apt-get install postgresql-9.3
```

### Hent koden
```
 $> git clone git://github.com/DanmarksAdresser/dawa.git
 $> cd dawa
```

### Hent dependencies
```
 $> npm install
```

### Importer data til lokal PostgreSQL
Dette skridt tager lidt tid...

Hent data filer fra aws.dk, og kør psql/setupdb.bash:

```
 $> wget http://file.aws.dk/csv/PostCode.csv.gz -O data/PostCode.csv.gz
 $> wget http://file.aws.dk/csv/AddressAccess.csv.gz -O data/AddressAccess.csv.gz
 $> wget http://file.aws.dk/csv/RoadName.csv.gz -O data/RoadName.csv.gz
 $> wget http://file.aws.dk/csv/AddressSpecific.csv.gz -O data/AddressSpecific.csv.gz
 $> bash psql/setupdb.bash
```

### Kør tests
```
 $> connectionstring=mongodb://<Mongo-settings> pgConnectionUrl=postgres://<PG-settings> npm test
 # Ex: connectionstring=mongodb://localhost/dawatest pgConnectionUrl=postgres://dawa:dawa@localhost:5432/dawa
```

Anvender Node v0.10.7.15 og MongoDB 2.4.1.


Status
====

Har i øjeblikket status af prototype.
Læs mere på digitaliser.dk

license
=======

MIT/X11