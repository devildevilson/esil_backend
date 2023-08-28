'use strict';

require("dotenv").config();
const hapi = require("@hapi/hapi");
const boom = require("@hapi/boom");
const joi = require("joi");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./apis/db");
const plt = require("./apis/platonus");
//const qs = require("qs");

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

async function sign_token(data, key, options) {
  return new Promise((resolve,reject) =>
    jwt.sign(data, key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
  );
}

async function verify_token(token, key, options) {
  return new Promise((resolve,reject) => 
    jwt.verify(token, key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
  );
}

async function decode_token(token, key, options) {
  try {
    return await verify_token(token, jwt_key, options);
  } catch (e) {
    console.log(e);
    throw boom.unauthorized(auth_error_msg);
    // if (e.name === "TokenExpiredError") throw boom.unauthorized(auth_error_msg);
    // if (e.name === "JsonWebTokenError") throw boom.unauthorized(auth_error_msg);
    // if (e.name === "NotBeforeError") throw boom.unauthorized(auth_error_msg);
  }
}

const jwt_key = "uguoncnvneuovpdsdavbpinrbpbnmbobuoyokqasqeqpbrjbrorrewhrggkjreijvqpiv";

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

server.route({
  method: 'GET',
  path: '/',
  handler: async function (request, h) {
    return "Hello, world";
  }
});

server.route({
  method: 'POST',
  path: '/cert/prepare',
  handler: async function (request, h) {
    const token_data = await decode_token(request.payload.token, jwt_key);
    //const cert_type = request.payload.cert_type;
    const role = await db.find_user_role(request.payload.user_id, "plt_student");
    if (!role || role.assotiated_id === 0) throw boom.forbidden(role_not_found_msg);
    
    const plt_user_id = role.assotiated_id;
    let cert_data = await plt.find_student_data_for_certificate(plt_user_id);
    if (!cert_data) throw boom.methodNotAllowed(could_not_get_cert_data_msg);

    cert_data.user_id = request.payload.user_id;
    cert_data.cert_type = request.payload.cert_type;
    cert_data.requested_by = request.payload.requested_by ? request.payload.requested_by : undefined;
    const cert_id = await db.create_row("cert_records", cert_data);
    cert_data.id = cert_id;

    return cert_data;
  },
  options: {
    validate: {
      payload: joi.object({
        token: joi.string().required(),
        user_id: joi.number().required(),
        cert_type: joi.number().required(),
        requested_by: joi.number(),
      })
    }
  }
});

server.route({
  method: 'POST',
  path: '/echo/post',
  handler: async function (request, h) {
    return request.payload;
  }
});

server.route({
  method: 'GET',
  path: '/cert/{cert_id}', 
  handler: async function (request, h) {
    const cert_data = await db.find_cert_record(request.params.cert_id);
    if (!cert_data) throw boom.notFound(cert_id_not_found_msg);

    return cert_data;
  },
  options: {
    validate: {
      params: joi.object({
        cert_id: joi.number().required()
      })
    }
  }
});

server.route({
  method: 'GET',
  path: '/user_certs/{user_id}', 
  handler: async function (request, h) {
    // request.query.token

    const cert_datas = await db.get_cert_records_by_user_id(cert_id);
    if (cert_datas.length === 0) throw boom.notFound(cert_user_id_not_found_msg);

    return cert_datas;
  },
  options: {
    validate: {
      params: joi.object({
        user_id: joi.number().required()
      })
    }
  }
});

const current_date = () => new Intl.DateTimeFormat("ru", { 
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
}).format(Date.now());

server.route({
  method: 'POST',
  path: '/auth',
  handler: async function (request, h) {
    const payload = request.payload;

    const user_data = await db.find_user_by_username(payload.username.trim().toLowerCase());
    if (!user_data) throw boom.unauthorized(auth_error_msg);

    //const match = await bcrypt.compare(payload.password, user_data.password);
    const match = payload.password === user_data.password;
    if (!match) throw boom.unauthorized(auth_error_msg);

    // пароль?
    const min_data = { id: user_data.id, username: user_data.username };
    const token = await sign_token(min_data, jwt_key);
    
    return {
      id: user_data.id,
      name: user_data.name,
      lastname: user_data.lastname,
      middlename: user_data.middlename,
      username: user_data.username,
      token,
      timestamp: current_date(),
    };
  },
  options: {
    validate: {
      payload: joi.object({
        username: joi.string().min(4).max(128).required(),
        password: joi.string().min(4).required()
      })
    }
  }
});

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