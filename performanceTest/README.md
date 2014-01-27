# Performence testing

This directory contains a set of performance tests. The scripts a
currently quite simple, so look in the code for more details.


## Custom script - with full logging

```
$> node performanceTest.js
```
The output file can be analysed with the R script: performance-analysis.r


## Bench-test

```
$> node performanceBenchTest.js
```

## Apache ab

```
$> ab -n 10000 -c10 -e percentiles.csv http://dawatest-env-igh3trup2y.elasticbeanstalk.com/adresser/0a3f50ae-da7f-32b8-e044-0003ba298018
```