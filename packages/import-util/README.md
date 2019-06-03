# DAWA Import utilities
This package contains utilities for importing data into the
DAWA database.

## Overview
DAWA is based on the PostgreSQL database. All importing logic
is essentially SQL based. Data from the different data sources 
is streamed to the database, and is then operated on using SQL statements.
Thus, this library is primarily a library for streaming data to the
database and generating SQL statements to operate on these data.

The DAWA database is large. It consists of more than a hundred tables, originating
from around 10 different sources. Furthermore, the database is highly denormalized in order to
provide efficient queries and maintain API compatibility. An additional challenge is that
all data is provided to consumers via the replication API. Therefore, events must be generated 
and stored reliably whenever the data is changed.

For (almost) every table in DAWA, an associated *change table* stores all changes to table. We may
distinguish between *base tables*, which contain normalized data in a format similar to the data
provided by the data sources, and *derived tables*, which combines data from multiple base tables as well as
additional columns such as PostgreSQL term search vectors for full text searching.

Derived tables are usually specified using *SQL views*.

## Importing process
Data importing follows the following pattern:

 * Data from the source is streamed directly into a temporary table in the database.
 * The temporary table containing the *desired state* is compared to the *current state* in the 
   base table. The operations (insert, update, delete) required to reconciliate are
   stored in the associated change table.
 * The operations are *applied* to the base table. Thereby, the current state becomes the desired state.
 * For every derived table, the *current state* in the derived table is compared with the *desired state*
   expressed by the SQL view associated with the derived table. Once again, the changes are stored in 
   the associated change table.

Some importers are capable of running *incrementally* without recomputing the entire state of the table.

## Transactions and events
All data manipulation is transactional. For each transaction, a unique *transaction ID* (`txid`) is
generated. Transactions are stored in the `transactions` table.

Each event describes a *single* operation on a table, either an `insert`, `update` or `delete` operation.
Events, changes and operations are generally used interchangeably.

Every changes is associated with a transaction. The table `tx_operation_counts` stores the number
of changes performed in each transaction.

## Change tables
Events are stored in change tables. There is one change table for each primary table. It is
conventionally named by the name of the primary table suffixed by "_changes". It has the same columns
as the primary table and the following additional columns:

 * `txid`: The transaction in which the change was performed.
 * `operation`: Whether the change is an `insert`, `update` or `delete`.
 * `public`: A boolean indicating whether the change is public (visible on the Replication API) or
   private (not visible - only internal columns such as TSVs are modified). The concept
   of non-public events is deprecated. Instead, it is preferred to create additional derived tables with any
   non-public columns.
 * `changeid`: The sequence number (sekvensnummer) for the event. Sequence numbers are deprecated, and generated
   for backwards compatibility purposes only.

## Streaming to database
The PostgreSQL database is able to receive streaming data in CSV format directly into a table using
the [COPY](https://www.postgresql.org/docs/current/sql-copy.html) command. We use NodeJS streams to
stream directly from input files to database. The file `src/postgres-streaming.js` contains utility
functions around the COPY command. 

## Comparing tables
Comparing tables is an essential part of the importing process. The implementation of this functionality is in
the file `src/table-diff.js`. The comparison process is also capable of deriving new data, such as 
[TSVs](https://www.postgresql.org/docs/current/textsearch.html), bounding boxes, visual centers and timestamps.

The comparison function requires a description of the table structure in order to perform comparisons
with a source table or view. This description is called a *table model*. The table model specifies:

 * The *name* of the table.
 * The *columns* of the table and how they behave in the comparison process.
 * The *primary key* column(s) of the table.
 
Each column of a table model must implement the protocol specified in `src/table-diff-protocol.js` -
see the source code docs for details. 
Most columns simply compare value of the table with the value from the source, but other
columns implement complex behaviors, such as uploading their content to S3.

Changing data in tables simply involves applying the operations in the change table to the primary table.

## Comparing changes incrementally
In addition to comparing an entire table agains a source table, it is also possible to perform
such a comparison on a *subset* of the table. Before this can happen, a list of *dirty* rows must be computed,
that is, rows that may potentially be changed. The primary keys of the dirty rows are stored in a temporary 
*dirty table*.

## Generating sequence numbers
Sequence numbers are generated at the *end* of the importing transaction. The code generating the
sequence numbers can be found in the file `src/transaction.js`.

## Derived tables (materializations)
Derived tables are also called *materializations* beacuse they resemble SQL [materialized views](https://www.postgresql.org/docs/current/rules-materializedviews.html).
The file `src/materialize.js` contains functions to update derived tables.

A materialization consists of:

 - A *table model*, as described above.
 - A *SQL View*.
 - A description of which tables the SQL view depends on.
 
Some materialiations can be computed *incrementally*. In order for this to happen, it is necessary to
compute the set of dirty rows - rows that may potentially be modified. This is not possible to do efficiently
in the general case, but there is support for doing it in the cases where the derived table contains a
foreign key reference to the table it is derived from.

A derived table may have both incremental and non-incremental dependencies.

An incremental dependency is possible if and only if there is a forein key relation between the derived
table and the dependency table. The foreign key dependency is part of the materialization model.

