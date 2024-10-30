'use strict';

require("dotenv").config();
require('module-alias/register');
const fastify = require("fastify")({ logger: true });
const routing = require("@core/routes");
const common = require("@core/common");
const db = require("@apis/db");
const platonus = require("@apis/platonus");
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');

fastify.register(require("fastify-multer").contentParser);


fastify.register(require('@fastify/sensible'));
const pdfDirectory = '/usr/share/ebooks/eLibraryBooks/';

fastify.get('/view/:filename', (request, reply) => {
  const { filename } = request.params;
  const filePath = path.posix.join(pdfDirectory, filename);

  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.error('File access error:', err);
      return reply.status(404).send({ error: 'File not found' });
    }

    // Set headers and send the file as response
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'inline');

    return reply.send(fs.createReadStream(filePath));
  });
});
// разрабатываем на http://localhost:5173
// REST RESTful
 fastify.register(require('@fastify/cors'), {
   origin: "http://localhost:5173",
   credentials: true,
   methods: [ "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH" ],
   allowedHeaders: [ "Authorization", "Accept","Origin","DNT","X-CustomHeader","Keep-Alive","User-Agent","X-Requested-With","If-Modified-Since","Cache-Control","Content-Type","Content-Range","Range" ]
 });

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
