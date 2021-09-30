# ECS Security Group
resource "aws_security_group" "ecs" {
  name        = "${local.full_name}-ECS"
  vpc_id      = data.terraform_remote_state.vpc.outputs.aws_vpc_main.id
}

resource "aws_security_group_rule" "allow_inbound_from_public_loadbalancer_to_ecs" {
  type            = "ingress"
  from_port       = var.docker_container_port
  to_port         = var.docker_container_port
  protocol        = "tcp"
  
  source_security_group_id = data.terraform_remote_state.loadbalancer.outputs.aws_security_group_lb_public.id

  security_group_id = aws_security_group.ecs.id

  description = "Allow incomming traffic from LoadBalancer on application port ${var.docker_container_port}"
}

resource "aws_security_group_rule" "allow_outbound_from_ecs_to_everywhere" {
  type            = "egress"
  from_port       = 0
  to_port         = 65535
  protocol        = "tcp"
  
  cidr_blocks = ["0.0.0.0/0"]

  security_group_id = aws_security_group.ecs.id

  description = "Allow ${var.name}-ECS to initiate outgoing traffic to everywhere"
}

# LoadBalancer
resource "aws_security_group_rule" "allow_outbound_from_public_loadbalancer_to_ecs" {
  type            = "egress"
  from_port       = var.docker_container_port
  to_port         = var.docker_container_port
  protocol        = "tcp"
  
  source_security_group_id = aws_security_group.ecs.id

  security_group_id = data.terraform_remote_state.loadbalancer.outputs.aws_security_group_lb_public.id

  description = "Allow outgoing traffic to ${var.name}-ECS on application port ${var.docker_container_port}"
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${local.full_name}-RDS"
  vpc_id      = data.terraform_remote_state.vpc.outputs.aws_vpc_main.id
}

resource "aws_security_group_rule" "allow_inbound_from_ecs_27017_to_documentDB" {
  type            = "ingress"
  from_port       = 5432
  to_port         = 5432
  protocol        = "tcp"
  
  source_security_group_id = aws_security_group.ecs.id

  security_group_id = aws_security_group.rds.id

  description = "Allow incomming traffic from ${var.name}-ECS port 5432"
}

resource "aws_security_group_rule" "allow_outbound_from_rds_to_everywhere" {
  type            = "egress"
  from_port       = 0
  to_port         = 65535
  protocol        = "tcp"
  
  cidr_blocks = ["0.0.0.0/0"]

  security_group_id = aws_security_group.rds.id

  description = "Allow all outgoing traffic from RDS"
}