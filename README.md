# Danmarks Adressers Web API - DAWA 
This is the code repository for [DAWA - Danmarks Adressers Web API](https://dawa.aws.dk).

## Technical overview
This repository is a "monorepo" utilizing [yarn workspaces](https://yarnpkg.com/features/workspaces). 
[Lerna](https://lerna.js.org/) is used for scripting releases and running tests.

## Running tests
First run `yarn install` to install dependencies and build the frontend code.

Setup a PostgreSQL server. Most recent stable PostgreSQL should work fine. 

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

## Support
Please ask any questions on [digitaliser.dk](https://digitaliser.dk/group/334445/forum).

## Bug reports
Bugs or feature suggestions can be submitted on [digitaliser.dk](https://digitaliser.dk/group/334445/forum), or you 
are welcome to create a Github issue.

## License

MIT/X11
