const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const bcrypt = require("bcryptjs");
const fs = require('fs').promises;

const DASHBOARD_PASS = process.env.DASHBOARD_PASS;


module.exports = [
  {
    method: 'GET',
    path: '/generate/cloud',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass===DASHBOARD_PASS) {
        const cloud_data = await db.get_dashboard_data();
        return cloud_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/platonus/student',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass===DASHBOARD_PASS) {
        const plt_data = await plt.generate_dashboard_data_student();
        return plt_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/platonus',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass===DASHBOARD_PASS) {
        const plt_data = await plt.generate_dashboard_data_tutor();
        return plt_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
];