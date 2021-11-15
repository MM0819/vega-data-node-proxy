const express = require('express');
const fs = require('fs');
const request = require('request');
const rp = require('request-promise');
const schedule = require('node-schedule');
const grpcJS = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const util = require('util');

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const PROTO_PATH = './nodes.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const TradingDataService = grpcJS.loadPackageDefinition(packageDefinition).datanode.api.v1.TradingDataService;

const api_hosts = [ 
  { url: 'http://vega-data-rest.chorus.one', healthy: false }, 
  { url: 'http://commodum.mainnet.vega.community:3009', healthy: false },
  { url: 'http://lovali.mainnet.vega.community:3009', healthy: false },
  { url: 'http://vega.xprv.io/datanode', healthy: false },
  { url: 'http://nala.mainnet.vega.community:3009', healthy: false },
  { url: 'http://b-harvest.mainnet.vega.community:3009', healthy: false },
  { url: 'http://staking-facilities.mainnet.vega.community:3009', healthy: false },
  { url: 'http://figment.mainnet.vega.community:3009', healthy: false },
  { url: 'http://nodes-guru.mainnet.vega.community:3009', healthy: false },
  { url: 'http://p2p.mainnet.vega.community:3009', healthy: false },
  { url: 'http://rockaway.mainnet.vega.community:3009', healthy: false },
  { url: 'http://greenfield-one.mainnet.vega.community:3009', healthy: false },
  { url: 'http://ryabina.mainnet.vega.community:3009', healthy: false }
];

const graphql_hosts = [ 
  { url: 'https://vega-data-graphql.chorus.one', healthy: false },
  { url: 'http://commodum.mainnet.vega.community:3008', healthy: false },
  { url: 'http://lovali.mainnet.vega.community:3008', healthy: false },
  { url: 'https://vega.xprv.io/datanode/query', healthy: false },
  { url: 'http://nala.mainnet.vega.community:3008', healthy: false },
  { url: 'http://b-harvest.mainnet.vega.community:3008', healthy: false },
  { url: 'http://staking-facilities.mainnet.vega.community:3008', healthy: false },
  { url: 'http://figment.mainnet.vega.community:3008', healthy: false },
  { url: 'http://nodes-guru.mainnet.vega.community:3008', healthy: false },
  { url: 'http://p2p.mainnet.vega.community:3008', healthy: false },
  { url: 'http://rockaway.mainnet.vega.community:3008', healthy: false },
  { url: 'http://greenfield-one.mainnet.vega.community:3008', healthy: false },
  { url: 'http://ryabina.mainnet.vega.community:3008', healthy: false }
];

const grpc_hosts = [
  { url: 'vega-data-grpc.chorus.one:443', healthy: false },
  { url: 'commodum.mainnet.vega.community:3007', healthy: false },
  { url: 'lovali.mainnet.vega.community:3007', healthy: false },
  { url: 'grpc.vega.xprv.io:443', healthy: false },
  { url: 'nala.mainnet.vega.community:3007', healthy: false },
  { url: 'b-harvest.mainnet.vega.community:3007', healthy: false },
  { url: 'staking-facilities.mainnet.vega.community:3007', healthy: false },
  { url: 'figment.mainnet.vega.community:3007', healthy: false },
  { url: 'nodes-guru.mainnet.vega.community:3007', healthy: false },
  { url: 'p2p.mainnet.vega.community:3007', healthy: false },
  { url: 'rockaway.mainnet.vega.community:3007', healthy: false },
  { url: 'greenfield-one.mainnet.vega.community:3007', healthy: false },
  { url: 'ryabina.mainnet.vega.community:3007', healthy: false }
];

const validators = [];

const block_url = 'http://dn1.vega.community:26657/block';
const genesis_url = 'http://dn1.vega.community:26657/genesis';

const config = {
  expected_app_version: 'v0.45.4',
  graphql_query: '{ \n nodes { \n id \n } \n }',
  timeout: 2000,
  expected_node_count: 13
};

let cur = 0;

const handler = (req, res, hosts) => {
  if(hosts.length === 0) {
    res.status(500).json({error: 'Service unavailable'});
    return;
  }
  const _req = request({ url: hosts[cur].url + req.url, timeout: config.timeout }).on('error', error => {
    res.status(500).json({error: error.message});
  });
  req.pipe(_req).pipe(res);
  cur = (cur + 1) % hosts.length;
};

const update_api_hosts_health = async () => {
  for(let i=0; i<api_hosts.length; i++) {
    const url = api_hosts[i].url;
    try {
      let result = await rp({ url: url + '/nodes', timeout: config.timeout });
      let json = JSON.parse(result);
      if(json.nodes.length === config.expected_node_count) {
        result = await rp({ url: url + '/statistics', timeout: config.timeout });
	json = JSON.parse(result);
	if(json.statistics.status === 'CHAIN_STATUS_CONNECTED' && 
	    json.statistics.appVersion === config.expected_app_version) {
          api_hosts[i].healthy = true;
        } else {
          api_hosts[i].healthy = false;
          console.log(`Unhealthy API host: ${url}`);
	}
      } else {
        api_hosts[i].healthy = false;
        console.log(`Unhealthy API host: ${url}`);
      }
    } catch(e) {
      api_hosts[i].healthy = false;
      console.log(`Unhealthy API host: ${url}`);
    }
  }
};

const update_graphql_hosts_health = async () => {
  for(let i=0; i<graphql_hosts.length; i++) {
    const url = graphql_hosts[i].url;
    try {
      let result = await rp({ url: url + '/query', headers: { 'Content-Type': 'application/json' }, timeout: config.timeout, method: 'POST', body: JSON.stringify({ query: config.graphql_query }) });
      let json = JSON.parse(result);
      if(json.data.nodes.length === config.expected_node_count) {
	graphql_hosts[i].healthy = true;
      } else {
        graphql_hosts[i].healthy = false;
        console.log(`Unhealthy GraphQL host: ${url}`);
      }
    } catch(e) {
      graphql_hosts[i].healthy = false;
      console.log(`Unhealthy GraphQL host: ${url}`);
    }
  }
};

const update_grpc_hosts_health = async () => {
  for(let i=0; i<grpc_hosts.length; i++) {
    const url = grpc_hosts[i].url;
    try {
      const client = new TradingDataService(url, grpcJS.credentials.createInsecure());
      const getNodes = util.promisify(client.getNodes).bind(client);
      const result = await getNodes({}, {deadline: Date.now() + config.timeout});
      if(result.nodes.length === config.expected_node_count) {
        grpc_hosts[i].healthy = true;
      } else {
        grpc_hosts[i].healthy = false;
        console.log(`Unhealthy gRPC host: ${url}`);
      }
    } catch(e) {
      grpc_hosts[i].healthy = false;
      console.log(`Unhealthy gRPC host: ${url}`);
    }
  }
};

const update_validators_health = async () => {
  let result = await rp({ url: genesis_url });
  let json = JSON.parse(result);
  for(let i=0; i<json.result.genesis.validators.length; i++) {
    const validator = json.result.genesis.validators[i];
    const check_validator = validators.filter(v => v.name === validator.name);
    const validator_name = json.result.genesis.app_state.validators[validator.pub_key.value].name;
    if(check_validator.length === 0) {
      validators.push({ name: validator_name, address: validator.address, signing: false });
    }
  }
  result = await rp({ url: block_url });
  json = JSON.parse(result);
  for(let i=0; i<json.result.block.last_commit.signatures.length; i++) {
    const signature = json.result.block.last_commit.signatures[i];
    let signing = false;
    for(let j=0; j<validators.length; j++) {
      if(signature.validator_address === validators[j].address) {
        validators[j].signing = true;
	signing = true;
      }
    }
    if(!signing) {
      validators[j].signing = false;
    }
  }
};

schedule.scheduleJob('* * * * *', async () => {
  await update_api_hosts_health();
  await update_graphql_hosts_health();
  await update_grpc_hosts_health();
  await update_validators_health();
});

const graphql = express().all('*', (req, res) => handler(req, res, graphql_hosts.filter(h => h.healthy)));
const api = express().all('*', (req, res) => handler(req, res, api_hosts.filter(h => h.healthy)));

const monitoring = express().get('/', async (req, res) => {
  res.json({
    config,
    signing_validators: validators.filter(v => v.signing).map(v => v.name),
    offline_validators: validators.filter(v => !v.signing).map(v => v.name),
    unhealthy_data_nodes: {
      grpc: grpc_hosts.filter(h => !h.healthy).map(h => h.url),
      api: api_hosts.filter(h => !h.healthy).map(h => h.url),
      graphql: graphql_hosts.filter(h => !h.healthy).map(h => h.url)
    },
    healthy_data_nodes: {
      grpc: grpc_hosts.filter(h => h.healthy).map(h => h.url),
      api: api_hosts.filter(h => h.healthy).map(h => h.url),
      graphql: graphql_hosts.filter(h => h.healthy).map(h => h.url)
    }
  });
});

api.listen(3000);
graphql.listen(3001);
monitoring.listen(3004);

