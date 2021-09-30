provider "aws" {
  region  = "eu-west-1"
}

terraform {
  backend "s3" {
    bucket = "aws-hungry-infrastructure-terraform"
    key    = "registry/dawa"
    dynamodb_table = "aws-hungry-infrastructure-terraform"
    region = "eu-west-1"
    role_arn = var.terraform_backend_s3_role_arn
  }
}