require('module-alias/register');
const boom = require("@hapi/boom");
const joi = require("joi");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

const current_date = () => new Intl.DateTimeFormat("ru", { 
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
}).format(Date.now());

module.exports = [
  {
    method: 'POST',
    path: '/',
    handler: async function (request, h) {
      const payload = request.payload;

      const user_data = await db.find_user_by_username(payload.username.trim().toLowerCase());
      if (!user_data) throw boom.unauthorized(auth_error_msg);

      //const match = await bcrypt.compare(payload.password, user_data.password);
      const match = payload.password === user_data.password;
      if (!match) throw boom.unauthorized(auth_error_msg);

      // пароль?
      const min_data = { id: user_data.id, username: user_data.username };
      const token = await common.sign_token(min_data, jwt_key);
      
      return {
        id: user_data.id,
        name: user_data.name,
        lastname: user_data.lastname,
        middlename: user_data.middlename,
        username: user_data.username,
        token,
        timestamp: common.human_date(),
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
  }
];