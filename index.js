'use strict';

require("dotenv").config();
require('module-alias/register');
const hapi = require("@hapi/hapi");
const boom = require("@hapi/boom");
const joi = require("joi");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("@apis/db");
const plt = require("@apis/platonus");
const routing = require("@core/routes");
//const qs = require("qs");

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

const routes = routing(`${__dirname}/routes`);
console.log("Server paths:");
for (const route of routes) {
  console.log(route.method, route.path);
}

const server = hapi.server({
  port: process.env.SERVER_PORT,
  host: process.env.SERVER_HOST,
  // query: {
  //   parser: (query) => qs.parse(query)
  // }
//  "routes": {
//    "cors": {
//       "origin": ["*"],
//       "headers": ["Accept", "Content-Type"],
//       "additionalHeaders": ["X-Requested-With"]
//     }
//  }
});

server.route(routes);

(async () => {
  await server.register({
    plugin: require('hapi-cors'),
    options: {
      origins: ['*']
    }
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
})();