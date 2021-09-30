accountname="aws-hungry-production"
environment="Production"
environment_short="Prod"

# Route 53
service_url="dawa.aws.hungrycloud.net"

# Datasource
lookup_route53_hosted_zone_sulten_dot_net="aws.hungrycloud.net."
datasource_lookup_cloudwatch_alarm_to_slack="Prod-CloudWatchAlarmToSlack"

# ALB
alb_deregistration_delay = 15
alb_health_check_interval= 10
alb_health_check_healthy_threshold= 2
alb_health_check_unhealthy_threshold= 2

# CloudWatch
cloudwatch_log_group_retention_in_days=90
cloudwatch_metric_alarm_healthy_host_count_threshold="2"
cloudwatch_metric_alarm_running_task_count_threshold="2"

# ECS
ecs_service_desired_count=2
ecs_service_deployment_minimum_healthy_percent=100
ecs_service_deployment_maximum_percent=200
ecs_service_health_check_grace_period_seconds=10

task_definition_cpu=1024
task_definition_memory=2048

# S3
s3_bucket_name_assets = "prod-assets-hungrygroup"