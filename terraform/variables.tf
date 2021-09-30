variable "terraform_backend_s3_role_arn" {}
variable "accountname" {}
variable "environment" { default = "" }
variable "environment_short" { default = "" }

# Datasource
variable "lookup_route53_hosted_zone_sulten_dot_net" {}
variable "datasource_lookup_api_gateway_api" {}
variable "datasource_lookup_cloudwatch_alarm_to_slack" {}

# Service
variable "name"{ default="Dawa" }

# Route 53
variable "service_url" {}

# Docker
variable "docker_container_port"{
    type = number
    default = 3000
}
variable "docker_container_protocol"{
    default = "HTTP"
}

# ALB
variable "alb_deregistration_delay" {  }
variable "alb_health_check_interval"{  }
variable "alb_health_check_healthy_threshold"{  }
variable "alb_health_check_unhealthy_threshold"{  }

# CloudWatch
variable "cloudwatch_log_group_retention_in_days"{}
variable "cloudwatch_metric_alarm_healthy_host_count_threshold" {}
variable "cloudwatch_metric_alarm_running_task_count_threshold" {}

# ECS
variable "ecs_service_desired_count"{}
variable "ecs_service_deployment_minimum_healthy_percent"{}
variable "ecs_service_deployment_maximum_percent"{}
variable "ecs_service_health_check_grace_period_seconds"{}

variable "task_definition_cpu"{}
variable "task_definition_memory"{}

# Locals

locals {
    full_name="${var.environment_short}-${var.name}"
}