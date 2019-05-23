#!/usr/bin/env node
/* eslint no-console: 0 */
const { exec } = require('../util');

// these env variables are supplied by codebuild.
const {AWS_DEFAULT_REGION } = process.env;

const loginCmd = exec(`aws ecr get-login --no-include-email --region ${AWS_DEFAULT_REGION}`);
exec(loginCmd);
exec(`docker tag dawa:latest 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:latest`);
exec(`docker push 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:latest`);

const tags = exec('git tag --points-at HEAD').split('\n').map(tag => tag.trim());
for(let tag of tags) {
  const match = tag.match(/@dawadk\/server-(.*)/);
  if(match) {
    const ecrTag = match[1];
    // slashes not permitted in docker tags
    console.log(`pushing tag ${ecrTag} to ECR`);
    exec(`docker tag dawa:latest 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:${ecrTag}`);
    exec(`docker push 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:${ecrTag}`);
  }
}

const branchRefs = exec(`git branch --points-at HEAD --format="%(refname)"`).split('\n').map(tag => tag.trim());
for(let branchRef of branchRefs) {
  const match = branchRef.match(/refs\/heads\/(.*)/);
  if(match) {
    const branch = match[1];
    console.log(`pushing branch ${branch} to ECR`);
    exec(`docker tag dawa:latest 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:${branch}`);
    exec(`docker push 587758073017.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/dawa:${branch}`);
  }
  else {
    console.log(`could not extract branch name from ref ${branchRef}`);
  }
}