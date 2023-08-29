const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwt_key = "uguoncnvneuovpdsdavbpinrbpbnmbobuoyokqasqeqpbrjbrorrewhrggkjreijvqpiv";

const common = {
  sign_token: async (data, options) => {
    return new Promise((resolve,reject) =>
      jwt.sign(data, jwt_key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
    );
  },

  verify_token: async (token, options) => {
    return new Promise((resolve,reject) => 
      jwt.verify(token, jwt_key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
    );
  },

  decode_token: async (token, options) => {
    try {
      return await verify_token(token, jwt_key, options);
    } catch (e) {
      console.log(e);
      throw boom.unauthorized(auth_error_msg);
      // if (e.name === "TokenExpiredError") throw boom.unauthorized(auth_error_msg);
      // if (e.name === "JsonWebTokenError") throw boom.unauthorized(auth_error_msg);
      // if (e.name === "NotBeforeError") throw boom.unauthorized(auth_error_msg);
    }
  },

  good_num: (num) => num < 10 ? "0"+num : ""+num,

  human_date: (date) => {
    const yyyy = common.good_num(date.getFullYear());
    const mm   = common.good_num(date.getMonth()+1);
    const dd   = common.good_num(date.getDate());
    const hh   = common.good_num(date.getHours());
    const MM   = common.good_num(date.getMinutes());
    const ss   = common.good_num(date.getSeconds());
    return `${yyyy}.${mm}.${dd} ${hh}:${MM}:${ss}`;
  },

  sql_date: (date) => {
    const yyyy = common.good_num(date.getFullYear());
    const mm   = common.good_num(date.getMonth()+1);
    const dd   = common.good_num(date.getDate());
    const hh   = common.good_num(date.getHours());
    const MM   = common.good_num(date.getMinutes());
    const ss   = common.good_num(date.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${MM}:${ss}`;
  },
};

module.exports = common;