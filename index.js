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

const server = hapi.server({
  port: process.env.SERVER_PORT,
  host: process.env.SERVER_HOST,
  // query: {
  //   parser: (query) => qs.parse(query)
  // }
});

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, h) {
    return "Hello, world";
  }
});

server.route({
  method: 'GET',
  path: '/prepare_cert/{user_id}',
  handler: function (request, h) {
    const query = request.query;
    // expecting query["token"] <= string
    // проверяем токен, берем данные справки из платонуса, кладем их в базу созданных справок, заполняем шаблон
    const user_id = request.params.user_id;
    // юзер_ид не равен ид студента из платонуса
    // возвращаем что? хтмл код справки
    return "Hello, world";
  }
});

server.route({
  method: 'GET',
  path: '/cert/{cert_id}', // 
  handler: function (request, h) {
    const user_id = request.params.cert_id;
    return "Hello, world";
  }
});

async function sign_token(data, key) {
  return new Promise((resolve,reject) =>
    jwt.sign(data, key, (err, decoded) => err ? reject({}) : resolve(decoded))
  );
}

async function verify_token(token, key) {
  return new Promise((resolve,reject) =>
    jwt.verify(token, key, (err, decoded) => err ? reject({}) : resolve(decoded))
  );
}

const jwt_key = "uguoncnvneuovpdsdavbpinrbpbnmbobuoyokqasqeqpbrjbrorrewhrggkjreijvqpiv";

const current_date = () => new Intl.DateTimeFormat("ru", { 
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
}).format(Date.now());

server.route({
  method: 'POST',
  path: '/auth',
  handler: async function (request, h) {
    const payload = request.payload;

    const user_data = await db.find_user_by_username(payload.username.trim().toLowerCase());
    if (!user_data) throw boom.unauthorized("Could not find user with this username")

    //const match = await bcrypt.compare(payload.password, user_data.password);
    const match = payload.password === user_data.password;
    if (!match) throw boom.unauthorized("Invalid password")

    // пароль?
    const min_data = { id: user_data.id, username: user_data.username };
    const token = await sign_token(min_data, jwt_key);
    
    return {
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
  await server.start();
  console.log(`Server running on ${server.info.uri}`);
})();