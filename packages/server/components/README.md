# Components
Components are modular building blocks that are responsible for modifying database tables
during the importing process. There are two kinds of components:

 - *Importers* populate tables from an external source (such as a web service or file).
 - *Processors* populate derived tables using data from other tables.
 
 Components has explicit dependencies - each component specify which tables it creates, and
 processors additionally specify which tables it depends on. 
 
 The file `execute.js` contains the `execute` function, which executes a series of components. The
 dependency graph is utilized. When calling `execute`, it is sufficient to specify which importers
 to run, any necessary processors is automatically run based on the dependency graph.
 
 Some processors are capable of performing an *incremental* update. Other processors always
 require a full analysis of all dependencies and recompute the entire table.
 
 ## Execution strategies
 There are three different execution strategies. The `quick` strategy only runs incremental processors - 
 and only if a dependency has changes. The `slow` strategy runs all processors. 
 The `verify` stratey runs all processors by recomputing all tables. This is usually only necessary
 when correcting errors.
 
 ## Transaction management
 The `execute` automatically creates a transaction and transactionid, and perform a rollback if no tables are changed.