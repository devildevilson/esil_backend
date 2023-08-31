'use strict';

require("dotenv").config();
require('module-alias/register');
const fastify = require("fastify")({ logger: true });
const routing = require("@core/routes");
const db = require("@apis/db");
const platonus = require("@apis/platonus");

fastify.register(require('@fastify/sensible'));

// разрабатываем на http://localhost:5173
fastify.register(require('@fastify/cors'), {
  origin: "http://localhost:5173",
  credenticals: true,
  methods: [ "GET", "POST", "PUT", "DELETE" ]
});

const routes = routing(`${__dirname}/routes`);
console.log("Server paths:");
for (const route of routes) {
  console.log(route.method, route.path);
  fastify.route(route);
}

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
    process.exit(1);
  }
})();