# Vega Data Node Proxy
This proxy server routes traffic to healthy data nodes on the Vega Mainnet.

## Install & Run

`npm install` & `node index.js`

Starting the app will expose services on three ports:

* http://localhost:3000 - proxy to the healthy REST API nodes
* http://localhost:3001 - proxy to the healthy GraphQL nodes
* http://localhost:3004 - API endpoint exposing information about the health of the data nodes on the network

The service currently contains hard-coded URLs for known data nodes that are running on the Vega Mainnet. There is a CRON job that runs once every minute and queries the services on each node to ensure they are returning the correct response. If a node is returning an unexpected response, or if it times out, then requests will not be routed to it via the proxy server.

## Mainnet

The following services are available via the `vega.community` domain, which is an unofficial domain used to host services and tools related to the Vega network:

* https://api.vega.community - REST API proxy
* https://graphql.vega.community - GraphQL proxy
* https://status.vega.community - reporting on the health of the data nodes
