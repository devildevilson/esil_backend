require('module-alias/register');
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
    handler: async function (request, reply) {
      const token_data = await common.decode_token(request.body.token);
      if (token_data.error) return reply.forbidden(token_data.error);

      let plt_user_id = 0;
      if (token_data.id === request.body.user_id) {
        const role = await db.find_user_role(request.body.user_id, "plt_student");
        if (!role || role.assotiated_id === 0) return reply.forbidden(role_not_found_msg);
        plt_user_id = role.assotiated_id;
      } else {
        // должна быть роль создателя справок
        const adm_role = await db.find_user_role(token_data.id, "admin");
        if (!adm_role) return reply.forbidden(role_not_found_msg);

        const role = await db.find_user_role(request.body.user_id, "plt_student");
        if (!role || role.assotiated_id === 0) return reply.forbidden(role_not_found_msg);
        plt_user_id = role.assotiated_id;
      }

      if (plt_user_id === 0) return reply.forbidden(role_not_found_msg);

      //const cert_type = request.body.cert_type;
      
      const plt_user_id = role.assotiated_id;
      let cert_data = await plt.find_student_data_for_certificate(plt_user_id);
      if (!cert_data) return reply.methodNotAllowed(could_not_get_cert_data_msg);

      cert_data.user_id = request.body.user_id;
      cert_data.cert_type = request.body.cert_type;
      cert_data.requested_by = request.body.requested_by ? request.body.requested_by : undefined;
      const cert_id = await db.create_row("cert_records", cert_data);
      cert_data.id = cert_id;

      return cert_data;
    },
    schema: {
      body: {
        type: "object",
        required: [ "token", "user_id", "cert_type" ],
        properties: {
          token: { type: "string" },
          user_id: { type: "number" },
          cert_type: { type: "number" },
          requested_by: { type: "number" },
        }
      }
    }
  }
];