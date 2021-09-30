resource "aws_cloudwatch_log_group" "log_group" {
  name = local.full_name
  retention_in_days = var.cloudwatch_log_group_retention_in_days
}

resource "aws_cloudwatch_metric_alarm" "healthy_host_count" {
  alarm_name                = "${local.full_name}-HealthyHostCount"
  comparison_operator       = "LessThanThreshold"
  evaluation_periods        = "1"
  metric_name               = "HealthyHostCount"
  namespace                 = "AWS/ApplicationELB"
  dimensions = {
      TargetGroup = "${aws_lb_target_group.main.arn_suffix}"
      LoadBalancer = "${data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.arn_suffix}"
  }
  period                    = "60"
  statistic                 = "Average"
  threshold                 = var.cloudwatch_metric_alarm_healthy_host_count_threshold
  alarm_description         = "This alarm monitors HealthyHostCount based on metric: AWS/ApplicationELB/HealthyHostCount for ${local.full_name}"
  alarm_actions = [data.aws_sns_topic.cloudwatch_alarm_to_slack.arn]
  treat_missing_data = "breaching"
}

resource "aws_cloudwatch_metric_alarm" "response_count_5xx" {
  alarm_name                = "${local.full_name}-HTTPCode_Target_5XX_Count"
  comparison_operator       = "LessThanThreshold"
  evaluation_periods        = "1"
  metric_name               = "HTTPCode_Target_5XX_Count"
  namespace                 = "AWS/ApplicationELB"
  dimensions = {
      TargetGroup = "${aws_lb_target_group.main.arn_suffix}"
      LoadBalancer = "${data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.arn_suffix}"
  }
  period                    = "60"
  statistic                 = "Sum"
  threshold                 = var.cloudwatch_metric_alarm_healthy_host_count_threshold
  alarm_description         = "This alarm monitors HTTPCode_Target_5XX_Count based on metric: AWS/ApplicationELB/HTTPCode_Target_5XX_Count for ${local.full_name}"
  alarm_actions = [data.aws_sns_topic.cloudwatch_alarm_to_slack.arn]
  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "running_task_count" {
  alarm_name                = "${local.full_name}-RunningTaskCount"
  comparison_operator       = "LessThanThreshold"
  evaluation_periods        = "1"
  metric_name               = "RunningTaskCount"
  namespace                 = "ECS/ContainerInsights"
  dimensions = {
      ClusterName = local.ecs_cluster_name
      ServiceName = local.full_name
  }
  period                    = "60"
  statistic                 = "Average"
  threshold                 = var.cloudwatch_metric_alarm_running_task_count_threshold
  alarm_description         = "This alarm monitors CPUUtilization based on metric: ECS/ContainerInsights/${local.ecs_cluster_name}/${local.full_name}/RunningTaskCount"
  alarm_actions = [data.aws_sns_topic.cloudwatch_alarm_to_slack.arn]
  treat_missing_data = "breaching"
}

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name                = "${local.full_name}-CPUUtilization"
  comparison_operator       = "GreaterThanOrEqualToThreshold"
  evaluation_periods        = "1"
  metric_name               = "CPUUtilization"
  namespace                 = "AWS/ECS"
  dimensions = {
      ClusterName = local.ecs_cluster_name
      ServiceName = local.full_name
  }
  period                    = "300"
  statistic                 = "Average"
  threshold                 = "80"
  alarm_description         = "This alarm monitors CPUUtilization based on metric: AWS/ApplicationELB/${local.ecs_cluster_name}/${local.full_name}/CPUUtilization"
  alarm_actions = [data.aws_sns_topic.cloudwatch_alarm_to_slack.arn]
  treat_missing_data = "missing"
}

locals {
  ecs_cluster_name_split = "${split("/", data.terraform_remote_state.ecs.outputs.aws_ecs_cluster_services.arn)}"
  ecs_cluster_name = "${local.ecs_cluster_name_split[length(local.ecs_cluster_name_split)-1]}"
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.full_name

  dashboard_body = <<EOF
{
    "widgets": [
        {
            "type": "log",
            "x": 12,
            "y": 2,
            "width": 12,
            "height": 18,
            "properties": {
                "query": "SOURCE '${local.full_name}' | fields @message\n| filter @message not like 'ELB-HealthChecker/2.0'\n| limit 50\n| sort @timestamp asc",
                "region": "eu-west-1",
                "stacked": false,
                "title": "Last 50 logs (asc)",
                "view": "table"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 28,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "CPUUtilization", "ServiceName", "${local.full_name}", "ClusterName", "${local.ecs_cluster_name}" ],
                    [ ".", "MemoryUtilization", ".", ".", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Average",
                "period": 300,
                "start": "-P1D",
                "end": "P0D",
                "title": "ECS Avg CPUUtilization and MemoryUtilization (5 mins)"
            }
        },
        {
            "type": "metric",
            "x": 6,
            "y": 2,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "TargetGroup", "${aws_lb_target_group.main.arn_suffix}", "LoadBalancer", "${data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.arn_suffix}", { "color": "#d62728" } ],
                    [ ".", "HTTPCode_Target_4XX_Count", ".", ".", ".", ".", { "color": "#ff7f0e" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Sum",
                "period": 300,
                "start": "-P1D",
                "end": "P0D",
                "title": "ALB-TG 4xx and 5xx Response Count (Sum 5 min)"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 2,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "RequestCount", "TargetGroup", "${aws_lb_target_group.main.arn_suffix}", "LoadBalancer", "${data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.arn_suffix}", { "color": "#1f77b4" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Sum",
                "period": 300,
                "title": "ALB-TG Sum Request (5 mins)"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 8,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "TargetResponseTime", "TargetGroup", "${aws_lb_target_group.main.arn_suffix}", "LoadBalancer", "${data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.arn_suffix}" ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Average",
                "period": 300,
                "title": "ALB-TG Avg ResponseTime (5 mins)"
            }
        },
        {
            "type": "metric",
            "x": 6,
            "y": 8,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "UnHealthyHostCount", "TargetGroup", "${aws_lb_target_group.main.arn_suffix}", "LoadBalancer", "${data.terraform_remote_state.loadbalancer.outputs.aws_lb_public.arn_suffix}", { "color": "#d62728" } ],
                    [ ".", "HealthyHostCount", ".", ".", ".", ".", { "color": "#2ca02c" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Average",
                "period": 60,
                "start": "-P1D",
                "end": "P0D",
                "title": "ALB-TG Avg UnHealthyHostCount and HealthyHostCount (5 mins)"
            }
        },
        {
            "type": "metric",
            "x": 18,
            "y": 22,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "ECS/ContainerInsights", "CpuReserved", "ServiceName", "${local.full_name}", "ClusterName", "${local.ecs_cluster_name}", { "color": "#d62728" } ],
                    [ ".", "CpuUtilized", ".", ".", ".", ".", { "color": "#1f77b4" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Average",
                "period": 300,
                "title": "ECS/ContainerInsights Avg CpuReserved and CpuUtilized (5 mins)"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 22,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "ECS/ContainerInsights", "MemoryUtilized", "ServiceName", "${local.full_name}", "ClusterName", "${local.ecs_cluster_name}", { "color": "#1f77b4" } ],
                    [ ".", "MemoryReserved", ".", ".", ".", ".", { "color": "#d62728" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Average",
                "period": 300,
                "title": "ECS/ContainerInsights Avg MemoryReserved and MemoryUtilized (5 mins)"
            }
        },
        {
            "type": "metric",
            "x": 18,
            "y": 28,
            "width": 6,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "ECS/ContainerInsights", "DesiredTaskCount", "ServiceName", "${local.full_name}", "ClusterName", "${local.ecs_cluster_name}", { "color": "#2ca02c" } ],
                    [ ".", "RunningTaskCount", ".", ".", ".", ".", { "color": "#1f77b4" } ],
                    [ ".", "PendingTaskCount", ".", ".", ".", ".", { "color": "#bcbd22" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "eu-west-1",
                "stat": "Average",
                "period": 60,
                "title": "ECS/ContainerInsights Avg Desired-, Running- and PendingTaskCount (1 mins)"
            }
        },
        {
            "type": "text",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 2,
            "properties": {
                "markdown": "\n# ApplicationLoadBalancer TargetGroup Metrics\n"
            }
        },
        {
            "type": "text",
            "x": 12,
            "y": 20,
            "width": 12,
            "height": 2,
            "properties": {
                "markdown": "\n# EasticContainerService Metrics\n"
            }
        },
        {
            "type": "text",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 2,
            "properties": {
                "markdown": "\n# Logs\n"
            }
        }
    ]
}
EOF
}
