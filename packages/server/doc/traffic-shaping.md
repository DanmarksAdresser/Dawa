# Traffic shaping in DAWA
DAWA is an open API. Anyone, anywhere can make any number requests to DAWA.
There is no authorization mechanisms. In order to ensure low response times
and access for everyone, DAWA employs a traffic shaping scheme.

## Architecture
There are multiple layers of protection in DAWA

### CloudFront
DAWA uses Amazon CloudFront as cache for all requests. CloudFront
provides the following protections:

 - Reduces load by caching repeated requests
 - Prevents some low-level DoS attacks
 - Some firewall functionality (e.g. blocking IPs or countries)
 
### Traffic Manager
DAWA uses a Brocade Virtual Traffic Manager. The TM takes care
of:
 
 - Load Balancing
 - Rate limiting (100 reqs/second as of 2019-07-02)
 
The load balancing scheme is hash-based. Each client is 
randomly routed to 2 backend instances.

### Application level traffic shaping
Each backend server monitors and limits the resource consumption of each client.
This prevents backend servers from being overloaded. Query time
and connections are divided equally among the clients.

#### Connection scheduling
Each client is allowed up to 10 (as of 2019-07-02) connections.
This limit is per backend server. If no connections are available,
the client is placed in a priority queue - the client with fewest
active connections is at the top of the queue.

Clients time out relatively quickly while waiting for a connection ()