const bcrypt = require("bcrypt");
const { createSigner, createDecoder, createVerifier } = require("fast-jwt");

const jwt_key = "uguoncnvneuovpdsdavbpinrbpbnmbobuoyokqasqeqpbrjbrorrewhrggkjreijvqpiv";
const sign = createSigner({ key: async () => jwt_key, expiresIn: "7d" });
const verify = createVerifier({ key: async () => jwt_key });

const auth_error_msg = "Authorization failed";

const salt_rounds = 10;

const common = {
  sign_token: async (data, options) => {
    // return new Promise((resolve,reject) =>
    //   jwt.sign(data, jwt_key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
    // );
    if (data.error) throw "Data must not provide error field for signing";
    return sign(data);
  },

  verify_token: async (token, options) => {
    // return new Promise((resolve,reject) => 
    //   jwt.verify(token, jwt_key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
    // );

    return verify(token);
  },

  decode_token: async (token, options) => {
    try {
      return await common.verify_token(token, options);
    } catch (e) {
      console.log(e);
      //throw boom.unauthorized(auth_error_msg); // как с ошибкой быть? наверное вернем error: str
      return { error: auth_error_msg };
      // if (e.name === "TokenExpiredError") throw boom.unauthorized(auth_error_msg);
      // if (e.name === "JsonWebTokenError") throw boom.unauthorized(auth_error_msg);
      // if (e.name === "NotBeforeError") throw boom.unauthorized(auth_error_msg);
    }
  },

  hash_password: (password) => bcrypt.hash(password, salt_rounds),
  compare_passwords: (passwordA, passwordB) => bcrypt.compare(passwordA, passwordB),

  good_num: (num) => num < 10 ? "0"+num : ""+num,

  human_date: (d) => {
    const date = new Date(d);
    const yyyy = common.good_num(date.getFullYear());
    const mm   = common.good_num(date.getMonth()+1);
    const dd   = common.good_num(date.getDate());
    const hh   = common.good_num(date.getHours());
    const MM   = common.good_num(date.getMinutes());
    const ss   = common.good_num(date.getSeconds());
    return `${yyyy}.${mm}.${dd} ${hh}:${MM}:${ss}`;
  },

  sql_date: (d) => {
    const date = new Date(d);
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