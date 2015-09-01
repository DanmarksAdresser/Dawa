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

Først oprettes en database, ved at køre scriptet createdb.bash

```
 $> bash psql/createdb/createdb.bash localhost <dbname> <user>
```

Herefter initialiseres databaseschemaet:

```
 $> node psql/setup-db.js --pgConnectionUrl=postgres://<user>@localhost/<dbname>
```

Dette giver en tom, men korrekt initialiseret databasen.
Proceduren for at indlæse adressedata findes indtil videre kun i den interne driftsdokumentation for DAWA, og det
udestår at tilføje den her.

## Start serveren
DAWA startes op ved at køre

```
 $> node server.js --pgConnectionUrl==postgres://<user>:<password>@<host>:<port>/<dbname>
```

## Kørsel af tests
Afvikling af tests kræver to databaser: dawatest, som indeholder et mindre sæt testdata, samt dawaempty, som er en tom database. Først oprettes de to databaser:
```
 $> bash psql/createdb/createdb.bash localhost dawatest <user>
 $> bash psql/createdb/createdb.bash localhost dawaempty <user>
```

Herefter initialiseres test-databasen:

```
  $> pgConnectionUrl=postgres://<user>@localhost/dawatest node psql/loadTestData.js
```

Dette sørger for at indlæse test-datasettet i databasen.
Herefter initialiseres dawaempty:
```
 $> node server.js --pgConnectionUrl==postgres://<user>:<password>@localhost/dawaempty node psql/setup-db.js
```

Nu kan tests afvikles:
```
 $> pgConnectionUrl=postgres://<user>@localhost/dawatest pgEmptyDbUrl=postgres://<user>@localhost/dawaempty \
 grunt test
```


##Release
For at lave et release køres 

 ```
  $> grunt release:<patch|minor|major>
 ```
 
Herved rettes app-versionen automatisk så det matcher det angivne level - ved patch rettes fx 0.52.4->0.52.5, ved
minor rettes fx 0.52.4->0.53.0, ved major rettes fx 0.52.4->1.0.0.
Rettelsen committes automatisk, og der laves et tag på formen v{det nye versionsnummer}, og dette tag committes automatisk.

Rettelserne pushes ikke automatisk, så man skal køre

 ```
  $> git push
 ```
 
 ```
  $> git push --tags
 ```

før releaset kan ses på Github.
