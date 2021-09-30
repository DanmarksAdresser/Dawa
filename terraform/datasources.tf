data "terraform_remote_state" "loadbalancer" {
  backend = "s3"
  workspace=var.accountname
  config = {
    bucket = "aws-hungry-infrastructure-terraform"
    key    = "common/ec2/loadbalancer"
    region = "eu-west-1"
    role_arn = "arn:aws:iam::${var.aws_account_id_infrastructure}:role/aws-hungry-infrastructure-terraform-role"
  }
}

data "terraform_remote_state" "ecs" {
  backend = "s3"
  workspace=var.accountname
  config = {
    bucket = "aws-hungry-infrastructure-terraform"
    key    = "common/ecs/clustersetup"
    region = "eu-west-1"
    role_arn = "arn:aws:iam::${var.aws_account_id_infrastructure}:role/aws-hungry-infrastructure-terraform-role"
  }
}

data "terraform_remote_state" "vpc" {
  backend = "s3"
  workspace=var.accountname
  config = {
    bucket = "aws-hungry-infrastructure-terraform"
    key    = "common/vpc/mainsetup"
    region = "eu-west-1"
    role_arn = "arn:aws:iam::${var.aws_account_id_infrastructure}:role/aws-hungry-infrastructure-terraform-role"
  }
}

data "terraform_remote_state" "registry" {
  backend = "s3"
  workspace="aws-hungry-internal"
  config = {
    bucket = "aws-hungry-infrastructure-terraform"
    key    = "registry/dawa"
    region = "eu-west-1"
    role_arn = "arn:aws:iam::${var.aws_account_id_infrastructure}:role/aws-hungry-infrastructure-terraform-role"
  }
}

data "terraform_remote_state" "vpctunnel" {
  backend = "s3"
  workspace=var.accountname
  config = {
    bucket = "aws-hungry-infrastructure-terraform"
    key    = "common/ec2/vpctunnel"
    region = "eu-west-1"
    role_arn = "arn:aws:iam::${var.aws_account_id_infrastructure}:role/aws-hungry-infrastructure-terraform-role"
  }
}

data "aws_route53_zone" "aws_dot_hungrycloud_dot_net" {
  name         = var.lookup_route53_hosted_zone_sulten_dot_net
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_api_gateway_rest_api" "api" {
  name = var.datasource_lookup_api_gateway_api
}

data "aws_sns_topic" "cloudwatch_alarm_to_slack" {
  name = var.datasource_lookup_cloudwatch_alarm_to_slack
}