resource "random_password" "rds_master" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = lower("${var.environment_short}-${var.servicename}")
  engine             = "aurora-postgresql"
  engine_mode        = "serverless"
  engine_version                  = "13.3"
  master_username                 = "postgres"
  master_password                 = random_password.rds_master.result
  availability_zones              = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  backup_retention_period         = var.rds_backup_retention_period
  preferred_backup_window         = "04:00-05:00"
  preferred_maintenance_window    = "sun:05:00-sun:06:00"
  vpc_security_group_ids          = [aws_security_group.rds.id, data.terraform_remote_state.pgadmin.outputs.aws_security_group_shared.id]
  storage_encrypted               = true
  apply_immediately               = true
  db_subnet_group_name            = aws_db_subnet_group.main.id
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.id
  final_snapshot_identifier = lower("${var.environment_short}-${var.servicename}-final")
  skip_final_snapshot = var.rds_skip_final_snapshot

  ## Investigate IAM Authentication at a later point
  #iam_database_authentication_enabled = true
  #iam_roles                           = []

  scaling_configuration {
    auto_pause               = var.rds_scaling_auto_pause
    seconds_until_auto_pause = var.rds_scaling_seconds_until_auto_pause
    min_capacity             = var.rds_scaling_min_capacity
    max_capacity             = var.rds_scaling_max_capacity
    timeout_action           = "RollbackCapacityChange"
  }
}

resource "aws_db_subnet_group" "main" {
  name = lower("${var.environment_short}-${var.servicename}")
  subnet_ids = [
    data.terraform_remote_state.vpc.outputs.aws_subnet_private_a.id,
    data.terraform_remote_state.vpc.outputs.aws_subnet_private_b.id,
    data.terraform_remote_state.vpc.outputs.aws_subnet_private_c.id
  ]
}

resource "aws_rds_cluster_parameter_group" "main" {
  name = lower("${var.environment_short}-${var.servicename}")
  family      = "aurora-postgresql10"
  description = "Parameter Group for ${var.environment_short}-${var.servicename}"

}
