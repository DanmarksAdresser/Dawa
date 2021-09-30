resource "aws_route53_record" "main" {
  zone_id = data.aws_route53_zone.aws_dot_hungrycloud_dot_net.id
  name    = var.service_url
  type    = "A"

  alias {
    name                   = data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.dns_name
    zone_id                = data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.zone_id
    evaluate_target_health = true
  }
}