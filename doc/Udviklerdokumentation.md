#Udviklerdokumentation
Dette dokument beskriver hvordan du som udvikler kommer i gang med DAWA.

##Forudsætninger
Du skal have [node](http://nodejs.org/download) (version 0.10) og [PostgreSQL](http://www.postgresql.org/download/)
(version 9.3) installeret. Desuden skal du bruge [git](http://git-scm.com) til at checke koden ud fra github og ændre i koden.

##Hent koden og afhængigheder
Check koden ud fra github og installer afhængigheder:
```
 $> git clone git://github.com/DanmarksAdresser/dawa.git
 $> cd dawa
 $> npm install
```

## Importer data i PostgreSQL
Dette skridt tager lidt tid.

Først oprettes en database. Der ligger er et script DAWA_SRC/psql/createdb.sql til dette.
Tilpas databasenavnet i dette script og kør det med psql.


Herefter intialiseres databaseschemaet:

```
 $> node psql/setup-db.js --pgConnectionUrl=postgres://<user>:<password>@<host>:<port>/<dbname>
```

Hent data filer fra aws.dk

```
 $> wget http://file.aws.dk/csv/PostCode.csv.gz -O data/PostCode.csv.gz
 $> wget http://file.aws.dk/csv/AddressAccess.csv.gz -O data/AddressAccess.csv.gz
 $> wget http://file.aws.dk/csv/RoadName.csv.gz -O data/RoadName.csv.gz
 $> wget http://file.aws.dk/csv/AddressSpecific.csv.gz -O data/AddressSpecific.csv.gz
```

Der er en fejl i AddressAccess.csv.gz, hvor der ikke er escapet korrekt i en af rækkerne. Dette problem kan fikses med sed:

```
 $> unzip < AddressAccess.csv.gz | sed -f DAWA_SRC/psql/replaceDoubleQuotes.sed.txt | gzip > AddressAccessFixed.csv.gz
```

For at indlæse adresserne køres:

```
 $> node psql/load-adresse-data.sql --pgConnectionUrl==postgres://<user>:<password>@<host>:<port>/<dbname> --dataDir=<directory med gzippede CSV-filer> --format=legacy
```

Herefter indlæses kommunerne:

```
 $> node psql/run-script.js --pgConnectionUrl==postgres://<user>:<password>@<host>:<port>/<dbname> psql/load-dagi-test-data.sql
```

PostgreSQL databasen er nu klar til brug. Der er dog ikke importeret DAGI-temaer.

## Start serveren
DAWA startes op ved at køre

```
 $> node server.js --pgConnectionUrl==postgres://<user>:<password>@<host>:<port>/<dbname>
```