# Start DAWA på MAC

 - Installer NodeJS seneste LTS
 - Installer postgres app fra https://postgresapp.com/
 - Opret en databaseserver (version 9.6) og start databasen
 - Configurer $PATH som beskrevet på https://postgresapp.com/
 - Installer homebrew fra https://brew.sh/
 - Installer p7zip med homebrew: brew install p7zip
 - Klon dawa fra Github: git clone https://github.com/DanmarksAdresser/Dawa.git
 - Kør npm install
 - Opret tom database: bash psql/createdb/createdb.bash localhost dawatest finn
 - Indlæs testdata: pgConnectionUrl=postgres://localhost/dawatest node psql/loadTestData.js 
 - Start serveren: pgConnectionUrl=postgres://localhost/dawatest npm start
 
For at skifte branch køres: git checkout <branch>, eksempelvis git checkout bootstrap4 eller git checkout master