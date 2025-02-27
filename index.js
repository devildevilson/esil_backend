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

fastify.get('/view', (request, reply) => {
  const params = request.query;
  const filePath = path.posix.join(pdfDirectory, params.filename);

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
fastify.register(require("@fastify/cors"), {
  origin: ["https://cloud.esil.edu.kz", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Authorization", "Accept", "Origin", "DNT", "X-CustomHeader", "Keep-Alive", "User-Agent", "X-Requested-With", "If-Modified-Since", "Cache-Control", "Content-Type", "Content-Range", "Range"]
});

// comment in case prod api requests break
fastify.addHook("onRequest", async (request, reply) => {
  const publicRoutes = [
    "/auth",
    "/view",
    "/stats",
    "/statsMain",
    "/statsWeekly",
    "/dashboard",
    "/logout",
    "/cert",
    "/applicant",
    "/docs", // add new public routes here
    "/upload/checkphotoeligibility"
  ];

  if (publicRoutes.some(route => request.routerPath.startsWith(route))) {
    return;
  }

  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new Error("No token provided");

    const token = authHeader.split(" ")[1];
    request.user = await common.decode_token(token);

    if (request.user.error) {
      throw new Error("Invalid token");
    }
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    const message = err.message+' (token)';
    console.log(message);
    return reply.status(401).send({ error: "Unauthorized", message: message });
  }
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
