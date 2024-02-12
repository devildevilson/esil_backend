const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const schedule = require('node-schedule');
const { createSigner, createDecoder, createVerifier } = require("fast-jwt");

const secure_str_storage = "./secure_str";
const get_secure_str = () => {
  try {
    const content = fs.readFileSync(secure_str_storage, "utf8");
    return content;
  } catch (e) {
    return "2e4a47fec32c2299a89f4cbc4a992cc4b76a6594f0e07ad07828102ce330b5cd702c89f6368994c321524edd903a695d";
  }
};

//console.log(get_secure_str());

let jwt = {
  sign: createSigner({ key: async () => get_secure_str(), expiresIn: "7d" }),
  verify: createVerifier({ key: async () => get_secure_str() })
};

const auth_error_msg = "Authorization failed";

const salt_rounds = 10;

const common = {
  sign_token: async (data, options) => {
    // return new Promise((resolve,reject) =>
    //   jwt.sign(data, jwt_key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
    // );
    if (data.error) throw "Data must not provide error field for signing";
    return jwt.sign(data);
  },

  verify_token: async (token, options) => {
    // return new Promise((resolve,reject) => 
    //   jwt.verify(token, jwt_key, options, (err, decoded) => err ? reject(err) : resolve(decoded))
    // );

    return jwt.verify(token);
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

  generate_random_string: async (count = 48) => {
    const buffer = await crypto.randomBytes(count);
    return buffer.toString("hex");
  },

  write_secure_str: (str) => {
    fs.writeFileSync(secure_str_storage, str, { encoding: "utf8", flag: "w" });
  },

  create_jwt_key_gen_job: () => {
    return schedule.scheduleJob('00 00 01 Jan,Apr,Jul,Oct *', async () => {
      const secure_str = await common.generate_random_string(64);
      common.write_secure_str(secure_str);
      jwt.sign = createSigner({ key: async () => secure_str, expiresIn: "7d" });
      jwt.verify = createVerifier({ key: async () => secure_str });
    });
  },
};

module.exports = common;