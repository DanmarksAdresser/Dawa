#!/usr/bin/env node
const { exec } = require('../util');

// these env variables are supplied by codebuild.
const { CODEBUILD_SOURCE_VERSION, AWS_DEFAULT_REGION } = process.env;

const loginCmd = exec(`aws ecr get-login --no-include-email --region ${AWS_DEFAULT_REGION}`);
exec(loginCmd);
exec(`docker tag dawa:latest 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:latest`);
exec(`docker push 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:latest`);

if(CODEBUILD_SOURCE_VERSION.match(/@dawadk\/server/)) {
  // slashes not permitted in docker tags
  const tag = CODEBUILD_SOURCE_VERSION.replace('/', '-');
  exec(`docker tag dawa:latest 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:${tag}`);
  exec(`docker push 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:${CODEBUILD_SOURCE_VERSION}`);
}
