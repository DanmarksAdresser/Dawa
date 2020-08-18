# Danmarks Adressers Web API - DAWA 
This is the code repository for [DAWA - Danmarks Adressers Web API](https://dawa.aws.dk).

## Technical overview
This repository is a "monorepo" utilizing [yarn workspaces](https://yarnpkg.com/features/workspaces). 
[Lerna](https://lerna.js.org/) is used for scripting releases and running tests.

## Setting up an environment
 - Install node from https://nodejs.org/en/, if you do not already have node. Latest LTS is fine.
 - Install yarn: `npm install -g yarn`
 - Install and start a PostgreSQL server, if you do not already have one. 
   For mac, https://postgresapp.com/ is very convenient. For other platforms, check out https://www.postgresql.org/download/ .
 - Install git, if you do not already have it: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
 - Clone the DAWA repository `git clone https://github.com/DanmarksAdresser/Dawa.git`
 - Optional: Install a NodeJS version manager that enables easy switching between NodeJS versions. Read more here: https://www.npmjs.com/package/n

## Running tests
First run `yarn install` to install dependencies and build the frontend code.

Create a configuration file that describes how the tests connect to the PostgreSQL database. The file should be stored in local-conf/test-conf.json5 .

The file should look something like this:

```json5
{
  test: {
    database_host: 'localhost',
    database_port: 5432,
    database_user: 'ahj',
    database_password: '',
  }
}
```

The user must have access to create and remove databases. Specifically, the following databases will be created automatically when running tests:

 - `dawatest`: Contains a small subset of production data used for testing
 - `dawaempty`: A completely empty database
 - `dawaschema`: A database where the complete DAWA schema has been loaded, but without any data in them.
 

When database and configuration is ready, run `yarn test` from the root of the repository.

## Starting a server
Running the test sets up a test database "dawatest", which is populated with a small subset of real production data.
There are scripts to start a local server against this database along with an appropriately configured local s3 stub.

Go to the directory `packages/server` and run `yarn run start-servers`. This will lauch a DAWA server on `http://localhost:3000` as
well as the S3 stub.

## Support
Please ask any questions on [digitaliser.dk](https://digitaliser.dk/group/334445/forum).

## Bug reports
Bugs or feature suggestions can be submitted on [digitaliser.dk](https://digitaliser.dk/group/334445/forum), or you 
are welcome to create a Github issue.

## License

MIT/X11
