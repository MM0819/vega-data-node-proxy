# Vega Data Node Proxy
This proxy server routes traffic to healthy data nodes on the Vega Mainnet.

## Install & Run

`npm install` & `node index.js`

Starting the app will expose services on four ports:

* http://localhost:3000 - proxy to the healthy REST API nodes
* http://localhost:3001 - proxy to the healthy GraphQL nodes
* http://localhost:3003 - proxy to the healthy gRPC nodes
* http://localhost:3004 - API endpoint exposing information about the health of the data nodes on the network
