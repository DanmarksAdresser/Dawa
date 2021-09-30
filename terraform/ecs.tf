resource "aws_ecs_task_definition" "main" {
  depends_on = [aws_cloudwatch_log_group.log_group]

  family                   = local.full_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_definition_cpu
  memory                   = var.task_definition_memory
  task_role_arn            = aws_iam_role.task_role.arn
  execution_role_arn       = aws_iam_role.task_execution_role.arn

  container_definitions = <<EOF
[
  {
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${local.full_name}",
        "awslogs-region": "eu-west-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "cpu": 0,
    "mountPoints": [],
    "volumesFrom": [],
    "portMappings": [
      {
        "protocol": "tcp",
        "containerPort": ${var.docker_container_port},
        "hostPort": ${var.docker_container_port}
      }
    ],
    "environment": [
    ],
    "secrets": [
    ],
    "image": "${data.terraform_remote_state.registry.outputs.aws_ecr_repository_main.repository_url}:staging",
    "essential": true,
    "name": "${var.environment_short}-${var.name}"
  }
]
EOF
}

resource "aws_ecs_service" "main" {
  # Count: Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count]
  }

  name            = local.full_name
  cluster         = data.terraform_remote_state.ecs.outputs.aws_ecs_cluster_services.arn
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.ecs_service_desired_count
  launch_type     = "FARGATE"

  load_balancer {
    target_group_arn = aws_lb_target_group.main.arn
    container_name   = local.full_name
    container_port   = var.docker_container_port
  }

  network_configuration {
    subnets = [
      data.terraform_remote_state.vpc.outputs.aws_subnet_private_a.id,
      data.terraform_remote_state.vpc.outputs.aws_subnet_private_b.id,
      data.terraform_remote_state.vpc.outputs.aws_subnet_private_c.id
    ]

    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  deployment_minimum_healthy_percent = var.ecs_service_deployment_minimum_healthy_percent
  deployment_maximum_percent         = var.ecs_service_deployment_maximum_percent
  health_check_grace_period_seconds  = var.ecs_service_health_check_grace_period_seconds
}