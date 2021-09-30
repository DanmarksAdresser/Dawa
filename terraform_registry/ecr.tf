resource "aws_ecr_repository" "main" {
  name                 = "dawa"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
output "aws_ecr_repository_main" {
  value = aws_ecr_repository.main
}

resource "aws_ecr_repository_policy" "cross_account_pull" {
  repository = aws_ecr_repository.main.name

  policy = <<EOF
{
    "Version": "2008-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS":[
                  "arn:aws:iam::${var.aws_hungry_accountid_staging}:root",
                  "arn:aws:iam::${var.aws_hungry_accountid_production}:root"
                ]
            },
            "Action": [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "ecr:DescribeRepositories",
                "ecr:DescribeImages"
            ]
        }
    ]
}
EOF
}
