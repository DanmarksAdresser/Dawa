#!/usr/bin/env bash
docker build -f docker/replication-client/Dockerfile -t dawadk/replication-client:latest .
docker login
docker push dawadk/replication-client:latest