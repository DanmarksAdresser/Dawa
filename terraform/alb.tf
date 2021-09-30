  // This is done because of issue with recreating TargetGroup if allready referenced by a LB Listener Rule
  // https://github.com/terraform-providers/terraform-provider-aws/issues/636#issuecomment-388781304
resource "random_string" "target_group_postfix" {
  length = 6
  special = false
}
resource "aws_lb_target_group" "main" {
  lifecycle {
    create_before_destroy = true
    ignore_changes = [name]
  }
  name     = "${local.full_name}-${random_string.target_group_postfix.result}"

  port        = var.docker_container_port
  protocol    = var.docker_container_protocol
  target_type = "ip"
  vpc_id      = data.terraform_remote_state.vpc.outputs.aws_vpc_main.id

  health_check{
      interval = var.alb_health_check_interval
      path = "/"
      protocol=var.docker_container_protocol
      healthy_threshold=var.alb_health_check_healthy_threshold
      unhealthy_threshold=var.alb_health_check_unhealthy_threshold
      matcher="200-299,301-302"
  }

  deregistration_delay = var.alb_deregistration_delay

  stickiness{
    type="lb_cookie"
    cookie_duration="43200"
    enabled=true
  }
}

resource "aws_lb_listener_rule" "host_based_routing" {
  listener_arn = data.terraform_remote_state.loadbalancer.outputs.aws_lb_listener_public_443.arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }

  condition {
    host_header {
      values = [var.service_url]
    }
  }
}
