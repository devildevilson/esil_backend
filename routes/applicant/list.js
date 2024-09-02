require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

const role_id = "plt_applicant";

module.exports = [
  {
    method: 'GET',
    handler: async function (request, reply) {
      const token_data = await common.decode_token(request.query.token);
      if (token_data.error) return reply.forbidden(token_data.error);

      const adm_role = await db.find_user_role(token_data.id, "admissionadmin");
      if (!adm_role) return reply.forbidden(role_not_found_msg);

      // получаем список id и отправляем его в базу платонуса
      const role_arr = await db.get_assotiated_id_arr_by_role(role_id);
      const str_arr = role_arr.map(elem => elem.assotiated_id).join(",");
      const users = await plt.get_student_data_by_id_arr(str_arr);
      
      // надо дополнить users idшниками как?
      let users_table = {};
      users.forEach(elem => { users_table[elem.plt_id] = elem; });
      role_arr.forEach(elem => { if (users_table[elem.assotiated_id]) users_table[elem.assotiated_id].id = elem.user_id; });
      //console.log(Object.values(users_table));
      for(let i=0; i<users.length; i++){
        const iin = await db.get_iin_by_user_id(users[i].id);
        const dormreq = await db.get_dorm_request_by_iin(iin.iin);
        if(dormreq != undefined) {
          Object.assign(users[i],{approved:dormreq.approved});   
        }
      }
      //console.log(Object.values(users_table))
      return Object.values(users_table);

      //const users = await db.get_users_with_role(role_id);
      //return users;
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "token" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
];
