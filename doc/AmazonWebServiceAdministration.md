
## Management Console

Sign-in to the AWS Management Console here:
[https://console.aws.amazon.com/](https://console.aws.amazon.com/)


## Setting up a PostgreSQL database

 - Sign in to the Management Console
 - Go to RDS (Relationel Database Service)
 - Set current region to EU (Ireland) in the dropdown meny in the
   upper rigth corner
 - Click "Lunch a DB Instance"
 - Follow the 6 steps to create a DB (creating a DB will take some
   minutes).  A number of DB-service paramters will decided!
 - In the steps above a Security Group was selected, go to RDS > VPN >
   Security Groups and ensure that correct access to the DB is
   configuren (if internet access is required, do a strict IP filter).
   Also se section on Security Groups


## AWS Security Groups

Access to services is controlled by Security Groups (SG).  To
configure SGs:

 - Go to the VPN service
 - Click Security Groups

