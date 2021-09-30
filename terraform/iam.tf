# Task Execution Role
resource "aws_iam_role" "task_execution_role" {
  name = "${local.full_name}-TaskExecutionRole"

  assume_role_policy = <<EOF
{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "task_execution_role_attachment" {
  role       = aws_iam_role.task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_role_ssm" {
  name = "allow_fetch_ssm_parameters"
  role = aws_iam_role.task_execution_role.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ssm:GetParameters"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment_short}/${var.name}/Environment/*"
    }
  ]
}
EOF
}

# Task Role
resource "aws_iam_role" "task_role" {
  name = "${local.full_name}-TaskRole"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

# Task User - credentials 
resource "aws_iam_user" "task_user" {
  name = "${local.full_name}-TaskUser"
}

resource "aws_iam_access_key" "task_user" {
  user = aws_iam_user.task_user.name
}

resource "aws_iam_user_policy" "s3" {
  name = "allow_s3_interaction"
  user = aws_iam_user.task_user.name

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::${var.s3_bucket_name_assets}/*",
                "arn:aws:s3:::${var.s3_bucket_name_assets}"
            ]
        }
    ]
}
EOF
}
