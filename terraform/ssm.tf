resource "aws_ssm_parameter" "DB_PASSWORD" {
  lifecycle {
    ignore_changes = [value]
  }

  name        = "/${var.environment_short}/${var.name}/RDS/Master/Password"
  description = "RDS Database Password for ${var.name}"
  type        = "SecureString"
  value       = random_password.rds_master.result
}