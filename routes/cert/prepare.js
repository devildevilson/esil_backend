require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const anarchy = true;
const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Сertificate data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

module.exports = [
  {
    method: 'POST',
    handler: async function (request, reply) {
      const token_data = await common.decode_token(request.body.token);
      if (token_data.error) return reply.status(401).send({ error: "Unauthorized", message: 'Token data error' });

      let requested_by = request.body.requested_by ? request.body.requested_by : request.body.user_id;
      let plt_user_id = 0;
      if (token_data.id === request.body.user_id) {
        const role = await db.find_user_role(request.body.user_id, "plt_student");
        if (!role || role.assotiated_id === 0) reply.status(401).send({ error: "Unauthorized", message: 'Incorrect role' });
        plt_user_id = role.assotiated_id;
      } else {
        // должна быть роль создателя справок
        const adm_role = await db.find_user_role(token_data.id, "admissionadmin");
        if (!adm_role) reply.status(401).send({ error: "Unauthorized", message: 'Role not found' });
        // по приоритету берем requested_by из тела сообщения
        requested_by = requested_by === request.body.user_id ? token_data.id : requested_by;

        const role = await db.find_user_role(request.body.user_id, "plt_student");
        if (!role || role.assotiated_id === 0) reply.status(401).send({ error: "Unauthorized", message: 'Role not found' });
        plt_user_id = role.assotiated_id;
      }

      if (plt_user_id === 0) reply.status(401).send({ error: "Unauthorized", message: 'Role not found' });

      //const cert_type = request.body.cert_type;
      
      //const plt_user_id = role.assotiated_id;
      let cert_data = await plt.find_student_data_for_certificate(plt_user_id);
      if (!cert_data) return reply.methodNotAllowed(could_not_get_cert_data_msg);

      cert_data.user_id = request.body.user_id;
      cert_data.cert_type = request.body.cert_type;
      cert_data.language = request.body.language;
      cert_data.requested_by = requested_by;
      const cert_id = await db.create_row("cert_records", cert_data);
      cert_data.id = cert_id;

      return cert_data;
    },
    schema: {
      body: {
        type: "object",
        required: [ "token", "language", "user_id", "cert_type" ],
        properties: {
          token: { type: "string" },
          language: { type: "string", maxLength: 5 },
          user_id: { type: "number" },
          cert_type: { type: "number" },
          requested_by: { type: "number" },
        }
      }
    }
  }
];