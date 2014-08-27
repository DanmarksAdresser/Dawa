# DAWA databasemodel
Dette dokument beskriver databasemodellen for DAWA. Databasen består af en række *primære tabeller*,
som indeholder kildedata som adgangsadresser, adresser, vejstykker, postnumre, ejerlav, hændelser. Nogle af disse tabeller
er tilknyttet historik-tabeller til brug for replikering.

Derudover består databasen af en række *sekundære tabeller*, som er afledt af de primære tabeller,
og som gør det muligt at udføre queries på data mere effektivt.

Derudover er der en række SQL *views*, som gør det nemmere
at udføre queries, samt en række *triggers* og *funktioner*, hvis rolle er at initalisere og vedligeholde sekundære
tabeller ud fra indholdet i de primære tabeller.

Et vist kendskab til domænet forudsættes. Læs evt. API-dokumentationen på [dawa.aws.dk](http://dawa.aws.dk) . Den domænemæssige betydning
 af de enkelte felter er ikke angivet i dette dokument, som primært fokuserer på hvordan domænet er oversat til et fysisk
 datamodel i PostgreSQL.

## Primære tabeller
De primære tabeller er tabellerne `enhedsadresser`, `adgangsadresser`, `vejstykker`, `postnumre`, `ejerlav`, `stormodtagere`, `dagitemaer`,
 `bbr_events`, `transaction_history` og `bbr_sekvensnummer`. Tabellerne `enhedsadresser`, `adgangsadresser`, `vejstykker`,
 `postnumre` og `ejerlav` er endvidere tilknyttet historiktabeller.

### Postnumre
Tabellen postnumre indholder alle postnumre. Et postnummer består af et nr (f.eks. '8260'), som er primærnøgle, et navn
 ('Viby J') samt en angivelse af om postnummeret er et såkaldt stormodtagerpostnummer. Et stormodtagerpostnummer er
  et særligt postnummer som er tilknyttet en enkelt organisation eller virksomhed. Typisk er der kun en enkelt eller meget
  få adresser tilknyttet et stormodtagerpostnummer.

 Postnumrene indlæses og opdateres ud fra en CSV-fil.

#### Definition

    CREATE TABLE IF NOT EXISTS postnumre (
      nr integer NOT NULL PRIMARY KEY,
      navn VARCHAR(20) NOT NULL,
      tsv tsvector,
      stormodtager boolean NOT NULL DEFAULT false
    );

### Vejstykker
Et vejstykke identificeres ved en `kommunekode` og en `vejkode`, og representerer et navngivet stykke vej inden for en kommune.
Hvis en vej gennemløber mere end én kommune vil den bestå af flere vejstykker.

#### Definition
    CREATE TABLE IF NOT EXISTS vejstykker (
      kommunekode integer NOT NULL,
      kode integer NOT NULL,
      oprettet timestamp,
      aendret timestamp,
      vejnavn VARCHAR(255) NOT NULL,
      adresseringsnavn VARCHAR(255),
      tsv tsvector,
      PRIMARY KEY(kommunekode, kode)
    );

### Adgangsadresser
En adgangsadresse er en struktureret betegnelse som angiver en særskilt adgang til et areal eller en bygning efter
reglerne i adressebekendtgørelsen. En adgangsadresse indeholder som minimum en angivelse af et vejstykke samt et husnr.
Adgangsadresser er identificeret ved en UUID. Adgangsadresser indeholder som regel også geografiske koordinater for
adgangspunktet.

Forskellen på en adresse og en adgangsadresse er, at adgangsadressen ikke indeholder etage- og dørangivelse. Alle på en given vej
med samme husnummer er således tilknyttet den samme adgangsadresse.

Kolonnerne `geom` og `tsv` er afledte kolonner. `geom` kolonnen anvendes til indeksering og `tsv` kolonnen anvendes til
fuldtekstsøgning.

#### Definition
    CREATE TABLE  adgangsadresser (
      id uuid NOT NULL PRIMARY KEY,
      kommunekode INTEGER NOT NULL,
      vejkode INTEGER NOT NULL,
      husnr VARCHAR(6) NOT NULL,
      supplerendebynavn VARCHAR(34) NULL,
      postnr INTEGER NULL,
      ejerlavkode INTEGER,
      matrikelnr VARCHAR(7) NULL,
      esrejendomsnr integer NULL,
      oprettet timestamp,
      ikraftfra timestamp,
      aendret timestamp,
      adgangspunktid uuid,
      etrs89oest double precision NULL,
      etrs89nord double precision NULL,
      noejagtighed CHAR(1) NULL,
      kilde integer NULL,
      placering char(1),
      tekniskstandard CHAR(2) NULL,
      tekstretning float4 NULL,
      kn100mdk VARCHAR(15) NULL,
      kn1kmdk VARCHAR(15) NULL,
      kn10kmdk VARCHAR(15) NULL,
      adressepunktaendringsdato timestamp NULL,
      geom  geometry(point, 25832),
      tsv tsvector
    );

### Enhedsadresser
En enhedsadresse udgør sammen med den tilknyttede adgangsadresse en fuld adresse med vej, husnr, etage, dør samt postnummerangivelse.
 Enhedsadresser identificeres ved en UUID. Feltet adagangsadresseid refererer tabellen adgangsadresser.

 Kolonnen `tsv` er en afledt kolonne, som anvendes til fuldtekstsøgning.

#### Definition
    CREATE TABLE IF NOT EXISTS enhedsadresser (
      id uuid NOT NULL PRIMARY KEY,
      adgangsadresseid UUID NOT NULL,
      oprettet timestamp,
      ikraftfra timestamp,
      aendret timestamp,
      etage VARCHAR(3),
      doer VARCHAR(4),
      tsv tsvector
    );

### Ejerlav
Ejerlav er i dag en betegnelse for en del af en ejendoms eller et jordstykkes matrikelnummer. Eksistensen af ejerlav
er primært historisk betinget. Et ejerlav består af en unik kode samt et navn. Ejerlavsoplysningerne stammer fra
[ejerlavsfortegnelsen](http://www.gst.dk/emner/matrikel-ejendomsdannelse/matrikelregister/ejerlavsfortegnelse/).

#### Definition
    CREATE TABLE ejerlav (
      kode INTEGER,
      navn VARCHAR(255) NOT NULL,
      PRIMARY KEY(kode)
    );

### Stormodtagere
Tabellen stormodtagere indeholder ekstra information om hvilke adgangsadresser der er tilknyttet et stormodtagerpostnummer. Bemærk,
at et stormodtagerpostnummer kan have tilknyttet mere end én adgangsadresse. Kolonnen `nr` angiver det tilknyttede postnummer.

Stormodtagerne opdateres ud fra en CSV-fil, som vedligeholdes manuelt.

#### Definition
    CREATE TABLE IF NOT EXISTS stormodtagere (
      nr integer NOT NULL,
      adgangsadresseid UUID NOT NULL
    );

### transaction_history
Tabellen `transaction_history` indeholder en angivelse af alle de ændringer der sker på historikførte data. Hver enkelt
ændring af en række tildeles et unikt sekvensnummer, som er angivet i kolonnen `sequence_number`. Derudover er der en
 angivelse af tidspunktet (`time` kolonnen) en angivelse af hvilken type objekt der er ændret (f.eks. 'adgangsadresse')
 samt en angivelse af om der er sket en insert, update eller delete i kolonnen `operation`.

Detaljeret information om ændringen er gemt i særskilte historik-tabeller.

### bbr_events
Tabellen `bbr_events` indeholder alle de hændelser, som er modtaget fra BBR og indlæst i databasen.

<table>
  <thead>
    <tr><th>Kolonne</th><th>Indhold</th></tr>
  </thead>
  <tbody>
    <tr><td>sekvensnummer</td><td>Hændelsesnummeret, som BBR har tildelt hændelsen</td></tr>
    <tr><td>type</td><td>Hvilken type hændelse der er tale om (f.eks. 'adgangsadresse')</td></tr>
    <tr><td>bbrtidspunkt</td><td>Det tidspunkt, som BBR har angivet for hændelsen</td></tr>
    <tr><td>created</td><td>Det tidspunkt hændelsen blev indlæst i databasen</td><tr>
    <tr><td>sequence_number_from, sequence_number_to</td><td>En BBR hændelse kan resultere i flere ændringer i data.
    Disse to kolonner angiver <em>sekvensnummrene</em> for de ændringer der er udført ved indlæsning af hændelsen
    (se også dokumentation for transaction_history tabellen).</td>
  </tbody>
</table>

#### Definition
    CREATE TABLE bbr_events(
      sekvensnummer integer NOT NULL,
      type varchar(255) NOT NULL,
      bbrTidspunkt timestamptz NOT NULL,
      created timestamptz NOT NULL,
      sequence_number_from integer not null,
      sequence_number_to integer not null,
      data json NOT NULL,
      PRIMARY KEY(sekvensnummer)
    );

### bbr_sekvensnummer
Tabellen `bbr_sekvensnummer` indeholder én række der angiver BBR hændelsesnummeret for den seneste hændelse, som er indlæst i databasen.
Dette vil under normale omstændigheder være sekvensnummeret for den sidste hændelse i bbr_events tabellen. Det kan dog
forekomme, at den seneste indlæsning af data var på baggrund af et udtræk fra BBR, hvorved tabellen vil indeholde
det BBR-sekvensnummer som er angivet i udtrækket.

### Dagitemaer
Tabellen dagitemaer indeholder de geografiske objekter vi modtager fra DAGI: kommuner, regioner, sogne, postnumre, politikredse m.v.

hvert tema har en type (f.eks. 'sogn'), en kode (heltal) samt en navn. Derudover er der tilknyttet et multipolygon, som
angiver temaets geografiske udstrækning. Disse kan være meget komplekse, en region består af op mod 300,000 punkter.

#### Definition
    CREATE TABLE DagiTemaer (
      tema DagiTemaType not null,
      kode integer not null,
      navn varchar(255),
      geom  geometry(MultiPolygon, 25832),
      tsv tsvector,
      PRIMARY KEY(tema, kode)
    );

### Historiktabeller
Tabellerne enhedsadresser, adgangsadresser, vejstykker, postnumre og ejerlav har tilknyttede historiktabeller.
Historiktabellerne benyttes til at udstille hændelser.


Historiktabellerne indeholder nøjagtig de samme felter som de primære tabeller, bortset fra evt. afledte kolonner
(`geom` og `tsv` kolonner).

Derudover indeholder historiktabellerne to kolonner `valid_from` og `valid_to`. Kolonnen `valid_from` indeholder sekvensnummeret
for den ændring hvor rækken blev tilføjet primærtabellen, og kolonnen `valid_to` indeholder sekvensnummeret for den
ændring hvor rækken blev slettet (eller opdateret) i primærtabellen.

Historiktabellerne vedligeholdes ved hjælp af triggers.

## Afledte tabeller
Der vedligeholdes et antal afledte tabeller, som anvendes til effektivt at kunne udføre de nødvendige queries.

### GriddedDagiTemaer
Dagitemaerne er voldsomt store (op mod 300,000 punkter). PostgreSQL er ikke i stand til effektivt at indeksere så store
multipolygoner. Derfor inddeles DAGI temaerne i mindre polygoner. Tabellen GriddedDagiTemaer indeholder disse. Tabellen
vedligeholdes ved hjælp af triggeren `update_gridded_dagi_temaer` på tabellen `dagitemaer`.

#### Definition
    CREATE TABLE GriddedDagiTemaer(
      tema dagiTemaType not null,
      kode integer not null,
      geom geometry
    );

### SupplerendeBynavne
De supplerende bynavne afledes af adgangsadresserne. Der eksisterer ikke nogen unik identifier for supplerende bynavne. Tabellen
indeholder også information om de postnumre og kommuner som er tilknyttet det supplerende bynavn.

Tabellen indeholder én række for hver kombination af supplerendebynavn, kommunekode og postnr, som optræder i adgangsadressetabellen.

#### Definition
    CREATE TABLE SupplerendeBynavne (
      supplerendebynavn VARCHAR(34) NOT NULL,
      kommunekode INTEGER NOT NULL,
      postnr INTEGER NOT NULL,
      tsv tsvector,
      PRIMARY KEY (supplerendebynavn, kommunekode, postnr)
    );

### AdgangsadresserDagiRel
Tabellen indeholder relationen mellem adgangsadresser og dagitemaer. Tabellen vedligeholdes ved hjælp af triggeren
`adgangsadresserdagirel_update_on_adgangsadresse` på tabellen adgangsadresser, samt triggeren
`update_gridded_dagi_temaer` på tabellen dagitemaer.

Tabellen indeholder én række for hver relation mellem adgangsadresse og dagitema.

#### Definition
    CREATE TABLE AdgangsAdresserDagiRel(
      adgangsadresseid uuid not null,
      dagitema DagiTemaType not null,
      dagikode integer not null,
      primary key(adgangsadresseid, dagitema, dagikode)
    );

### postnumre_kommunekoder_mat
Tabellen afledes af adgangsadresser, og indeholder relationen mellem postnumre og kommunekoder. Tabellen vedligeholdes
af triggeren `postnumre_kommunekoder_mat_trigger` på tabellen adgangsadresser.

#### Definition
    CREATE TABLE postnumre_kommunekoder_mat(
      postnr integer NOT NULL,
      kommunekode integer NOT NULL,
      PRIMARY KEY(postnr, kommunekode)
    );

### VejstykkerPostnumreMat
Tabellen indeholder relationen mellem vejstykker og postnumre, og afledes af adgangsadresser tabellen. Den vedligeholdes
af triggeren `update_vejstykker_postnumre_mat`.

#### Definition
    CREATE TABLE VejstykkerPostnumreMat(
      kommunekode INTEGER,
      vejkode INTEGER,
      postnr INTEGER
    );

## Views

### AdgangsadresserView
View'et AdgangsadresserView anvendes, når der returneres komplette adgangsadresser med relateret information.

#### Definition
    CREATE VIEW AdgangsadresserView AS
      SELECT
        A.id as a_id,
        A.husnr,
        A.supplerendebynavn,
        A.matrikelnr,
        A.esrejendomsnr,
        A.oprettet AS a_oprettet,
        A.ikraftfra as a_ikraftfra,
        A.aendret  AS a_aendret,
        A.etrs89oest::double precision AS oest,
        A.etrs89nord::double precision AS nord,
        A.geom       AS geom,
        A.noejagtighed,
        A.kilde::smallint,
        A.tekniskstandard,
        A.tekstretning,
        A.kn100mdk,
        A.kn1kmdk,
        A.kn10kmdk,
        A.adressepunktaendringsdato,

        P.nr   AS postnr,
        P.navn AS postnrnavn,

        V.kode    AS vejkode,
        V.vejnavn AS vejnavn,

        A.ejerlavkode,
        EL.navn AS ejerlavnavn,

        K.kode AS kommunekode,
        K.navn AS kommunenavn,
        array_to_json((select array_agg(DISTINCT CAST((D.tema, D.kode, D.navn) AS DagiTemaRef)) FROM AdgangsadresserDagiRel DR JOIN DagiTemaer D  ON (DR.adgangsadresseid = A.id AND D.tema = DR.dagiTema AND D.kode = DR.dagiKode))) AS dagitemaer,
        A.tsv

      FROM adgangsadresser A
        LEFT JOIN ejerlav AS EL ON (A.ejerlavkode = EL.kode)
        LEFT JOIN vejstykker        AS V   ON (A.kommunekode = V.kommunekode AND A.vejkode = V.kode)
        LEFT JOIN Postnumre       AS P   ON (A.postnr = P.nr)
        LEFT JOIN DagiTemaer AS K ON (K.tema = 'kommune' AND K.kode = A.kommunekode);


### Adresser
View'et Adresser anvendes, når der returneres komplette adresser.

#### Definition
    CREATE VIEW adresser AS
      SELECT
        E.id        AS e_id,
        E.oprettet  AS e_oprettet,
        E.ikraftfra AS e_ikraftfra,
        E.aendret   AS e_aendret,
        E.tsv       AS e_tsv,
        E.etage,
        E.doer,
        A.*
      FROM enhedsadresser E
        LEFT JOIN adgangsadresserView A  ON (E.adgangsadresseid = A.a_id);

### PostnumreMini
View'et anvendes til JOINs, når der kun ønskes nr og navn på postnummeret

#### Definition
    CREATE VIEW PostnumreMini AS
      SELECT nr, navn FROM Postnumre;

### VejstykkerView
View'et VejstykkerView anvendes, når der returneres komplette vejstykker med relateret information.

#### Definition
    CREATE VIEW vejstykkerView AS
      SELECT
        vejstykker.kode,
        vejstykker.kommunekode,
        vejnavn,
        vejstykker.tsv,
        max(kommuner.navn) AS kommunenavn,
        json_agg(PostnumreMini) AS postnumre
      FROM vejstykker
        LEFT JOIN Dagitemaer kommuner ON kommuner.tema = 'kommune' AND vejstykker.kommunekode = kommuner.kode
        LEFT JOIN VejstykkerPostnumreMat vejstykkerPostnr
          ON (vejstykkerPostnr.kommunekode = vejstykker.kommunekode AND vejstykkerPostnr.vejkode = vejstykker.kode)
        LEFT JOIN PostnumreMini ON (PostnumreMini.nr = postnr)
      GROUP BY vejstykker.kode, vejstykker.kommunekode;
