require('module-alias/register');
const bcrypt = require("bcryptjs");
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Сertificate data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

const current_date = () => new Intl.DateTimeFormat("ru", { 
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
}).format(Date.now());

const db_functions_array = { "plt_student": plt.find_student_by_iin, "plt_applicant": plt.find_applicant_by_iin, "plt_tutor": plt.find_tutor_by_iin };
async function get_plt_data_and_role(iin) {
  for (const [ role_id, db_func ] of Object.entries(db_functions_array)) {
    const data = await db_func(iin);
    if (data) return [ data, role_id ];
  }

  return [];
}

module.exports = [
  {
    method: 'POST',
    path: '/',
    handler: async (request, reply) => {
      console.log('POST started');
      const payload = request.body;
      const username = payload.username.trim().toLowerCase();
      console.log('username: '+username);
      let cafedraname = '', cafedraid = '';
      if (username=='6172'){
        let user_data = await db.find_user_by_username(username);
        let user_role = await db.get_role_by_username(username);
        const role_str = user_role.role;
        console.log(role_str);
        if (!user_data) return reply.unauthorized(auth_error_msg);
  
        const match = await common.compare_passwords(payload.password, user_data.password);
        if (!match) return reply.unauthorized(auth_error_msg);

        const min_data = { id: user_data.id, username: user_data.username };
        const token = await common.sign_token(min_data);

        return {
          id: user_data.id,
          name: user_data.name,
          lastname: user_data.lastname,
          middlename: user_data.middlename,
          username: user_data.username,
          role_str,
          token,
          timestamp: common.human_date(new Date()),
        };
      }

      let user_data = await db.find_user_by_username(username);
      //let plt_data;
      if (!user_data) {
        const [ plt_data, role_id ] = await get_plt_data_and_role(username);
        if (!plt_data) return reply.unauthorized(auth_error_msg);

        const password_hash = await common.hash_password(username);
        
        const db_user_data = {
          name: plt_data.name,
          lastname: plt_data.lastname,
          middlename: plt_data.middlename,
          username: username,
          iin: username,
          password: password_hash,
        };

        const user_id = await db.create_row("users", db_user_data);

        const role_data = {
          user_id,
          role: role_id,
          assotiated_id: plt_data.plt_id
        };

        await db.create_row("roles", role_data);

        if (role_id === "plt_tutor") {
          const tutorCafedra = await plt.get_tutor_cafedra_by_iin(username);
          const tutorAcademicDegree = await plt.get_tutor_academic_degree_by_iin(username);
          cafedraname = tutorCafedra.cafedraNameRU;
          cafedraid = tutorCafedra.cafedraid;
          const academicdegreeid = tutorAcademicDegree.AcademicDegreeID;
          console.log('cafedra name:',cafedraname);

          const kpi_data = {
            userid: user_id,
            score: 0,
            cafedra: cafedraid,
            academicstatusid: academicdegreeid
          }
          console.log('role selected: tutor');
          // have to find end set tutor's cafedra
          await db.create_row("kpi_scores",kpi_data);
        }

        user_data = await db.find_user_by_username(username);
      }

      const iin = await db.get_iin_by_username(username);
      console.log('IIN: '+iin);
      
      user_role = await db.get_role_by_username(username);
      const role_str = user_role.role;
      console.log(role_str);
      if (!user_data) return reply.unauthorized(auth_error_msg);

      const match = await common.compare_passwords(payload.password, user_data.password);
      if (!match) return reply.unauthorized(auth_error_msg);

      // скорее всего нужно будет еще добавить проверку смены статуса поступающий/студент/препод

      // пароль?
      const min_data = { id: user_data.id, username: user_data.username };
      const token = await common.sign_token(min_data);

      let KPIScore, user_id, update;
      if (role_str === 'plt_tutor') {
        const tutorCafedra = await plt.get_tutor_cafedra_by_iin(iin);
        cafedraname = tutorCafedra.cafedraNameRU;
        cafedraid = tutorCafedra.cafedraid;
        user_id = await db.get_user_id_by_iin(iin);
        user_id = user_id.id;
        console.log('trying to find and update tutor\'s KPI');
        update = await db.update_kpi_for_user(user_id);
        KPIScore = await db.get_kpiscore_by_userid(user_id);
        KPIScore = KPIScore.score;
      }

      return {
        id: user_data.id,
        name: user_data.name,
        lastname: user_data.lastname,
        middlename: user_data.middlename,
        username: user_data.username,
        cafedraname,
        cafedraid,
        role_str,
        KPIScore,
        user_id,
        token,
        timestamp: common.human_date(new Date()),
      };

      //} catch (e) { console.log(e); }
    },
    schema: {
      body: {
        type: "object",
        required: [ "username", "password" ],
        properties: {
          username: { type: "string", minLength: 4, maxLength: 128 },
          password: { type: "string", minLength: 4 },
        }
      }
    }
  }
];