require('module-alias/register');
const boom = require("@hapi/boom");
const joi = require("joi");
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

module.exports = [
  {
    method: 'POST',
    handler: async function (request, h) {
      const token_data = await common.decode_token(request.payload.token);
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
  }
];