const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const mdl = require('@apis/moodle');
const bcrypt = require("bcryptjs");
const fs = require('fs').promises;

const DASHBOARD_PASS = process.env.DASHBOARD_PASS;


module.exports = [
  {
    method: 'GET',
    path: '/generate/cloud',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
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
    path: '/generate/attendance',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const params = request.query;
        const firstname = params.lastname;
        const attendance_data = await db.get_attendance_data_by_lastname(firstname,1000);
        return attendance_data;
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
    path: '/generate/attendance/students',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const date = new Date()
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        let previousmonth = 1;
        let previousyear = 1;
        if (month != 1){ 
          previousmonth = month - 1;
          previousyear = year;
        }
        else {
          previousmonth = 12;
          previousyear = year - 1;
        }
        const attendance_data = await db.get_student_attendance_data_for_prev_month(previousmonth,previousyear);
        return attendance_data;
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
    path: '/generate/attendance/employee',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const params = request.query;
        const iin = params.iin;
        const attendance_data = await db.get_attendance_data_by_iin_employee(iin,1000);
        return attendance_data;
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
    path: '/generate/attendance/specialties',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const date = new Date()
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        let previousmonth = 1;
        let previousyear = 1;
        if (month != 1){ 
          previousmonth = month - 1;
          previousyear = year;
        }
        else {
          previousmonth = 12;
          previousyear = year - 1;
        }
        const attendance_data = await db.get_attendance_data_specialties(previousmonth, previousyear);
        for(row of attendance_data){
          const studentcount = await plt.get_student_count_by_specialization(row.department);
          row.maxcount = studentcount;
          const percentage = (row.count/studentcount * 100).toFixed(2);
          if (percentage > 100) row.percentage = 'Ожидание зачисления студентов';
          else row.percentage = percentage + '%';
          // 🥺👉👈
        }
        return attendance_data;
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
    path: '/generate/moodle/tests',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const term = request.query.term;
        if (term != 1 && term != 2) return reply.unauthorized('Term accepted values are 1, 2');
        const tests_data = await mdl.get_moodle_tests_data(term);
        return tests_data;
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
    path: '/generate/moodle/files',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const term = request.query.term;
        if (term != 1 && term != 2) return reply.unauthorized('Term accepted values are 1, 2');
        const tests_data = await mdl.get_moodle_files_data(term);
        return tests_data;
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
    path: '/generate/moodle/percentage',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const term = request.query.term;
        if (term != 1 && term != 2) return reply.unauthorized('Term accepted values are 1, 2');
        const tests_data = await mdl.get_moodle_files_data_cafedras(term);
        return tests_data;
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
      if (pass === DASHBOARD_PASS) {
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
      if (pass === DASHBOARD_PASS) {
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