'use strict';

require("dotenv").config();
require('module-alias/register');
const fastify = require("fastify")({ logger: true });
const routing = require("@core/routes");

fastify.register(require('@fastify/sensible'));

fastify.register(require('@fastify/cors'), {
  origin: "*"
});

// process.on("unhandledRejection", (err) => {
//   console.log(err);
//   process.exit(1);
// });

const routes = routing(`${__dirname}/routes`);
console.log("Server paths:");
for (const route of routes) {
  console.log(route.method, route.path);
  fastify.route(route);
}

// fastify.get('/', async (request, reply) => {
//   return { hello: 'world' }
// });

// fastify.route(
// // {
// //   method: 'GET',
// //   url: '/',
// //   schema: {
// //     querystring: {
// //       name: { type: 'string' },
// //       excitement: { type: 'integer' }
// //     },
// //   },
// //   handler: async (request, reply) => {
// //     return { hello: 'world' };
// //   },
// // },
// {
//   method: 'GET',
//   url: '/',
//   schema: {
//     querystring: {
//       name: { type: 'string' },
//       excitement: { type: 'integer' }
//     },
//   },
//   handler: async (request, reply) => {
//     return { hello: 'world' };
//   },
// }
// );

(async () => {
  try {
    await fastify.listen({ 
      port: process.env.SERVER_PORT,
      host: process.env.SERVER_HOST, 
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();