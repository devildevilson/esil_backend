'use strict';

require("dotenv").config();
require('module-alias/register');
const fastify = require("fastify")({ logger: true });
const routing = require("@core/routes");
const common = require("@core/common");
const db = require("@apis/db");
const platonus = require("@apis/platonus");
const schedule = require('node-schedule');

fastify.register(require('@fastify/sensible'));

// разрабатываем на http://localhost:5173
// fastify.register(require('@fastify/cors'), {
//   origin: "http://localhost:5173",
//   credenticals: true,
//   methods: [ "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH" ],
//   allowedHeaders: [ "Authorization", "Accept","Origin","DNT","X-CustomHeader","Keep-Alive","User-Agent","X-Requested-With","If-Modified-Since","Cache-Control","Content-Type","Content-Range","Range" ]
// });

process.on('SIGINT', function () { 
  schedule.gracefulShutdown().then(() => process.exit(0));
});

const routes = routing(`${__dirname}/routes`);
console.log("Server paths:");
for (const route of routes) {
  console.log(route.method, route.path);
  fastify.route(route);
}

const job = common.create_jwt_key_gen_job();

(async () => {
  try {
    await fastify.listen({ 
      port: process.env.SERVER_PORT,
      host: process.env.SERVER_HOST, 
    });
  } catch (err) {
    fastify.log.error(err);
    await db.close();
    await platonus.close();
    job.cancel();
    await schedule.gracefulShutdown();
    process.exit(1);
  }
})();
