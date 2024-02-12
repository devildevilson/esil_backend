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

module.exports = [
  {
    method: 'POST',
    path: '/',
    handler: async (request, reply) => {
      console.log('POST started');
      const payload = request.body;
      const iin = payload.username.trim().toLowerCase();
      console.log('IIN: '+iin);
      let cafedraname = '', cafedraid='';
      if (iin=='6172'){
        let user_data = await db.find_user_by_username(iin);
        let user_role = await db.get_role_by_iin(iin);
        const role_str = user_role.role;
        console.log(role_str);
        if (!user_data) return reply.unauthorized(auth_error_msg);
  
        const match = await common.compare_passwords(payload.password, user_data.password);
        if (!match) return reply.unauthorized(auth_error_msg);

        const min_data = { id: user_data.id, username: user_data.username };
        const token = await common.sign_token(min_data);
        if(role_str=='plt_kpiadmin'){
          // actions to be done when kpi administrator logs in
          // prepare cafedra statistics, get all tutors
          // tutors have to be found using a searchbar
        }
        // if(role_str=='plt_kpiadmin_cafedra'){
        //   // IMPORTANT NOTE:
        //   // cafedra leader has to have heightened access to see ONLY his tutors' data
        // }
  
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
      //try {
      let user_data = await db.find_user_by_username(iin);
      let plt_data;
      if (!user_data) {
        let flag_as_tutor=false;
        console.log('user is not in db, trying to create');
        // найдем пользователя в платонусе
        plt_data = await plt.find_student_by_iin(iin);
        if (!plt_data) {
          console.log('didnt find student, trying to find tutor');
          plt_data = await plt.find_tutor_by_iin(iin);
          if(plt_data){ 
            flag_as_tutor=true;
            console.log('found tutor');
            console.log('tutor:');
            console.log(plt_data);
          }
          else{
            console.log('didnt find anyone');
            return reply.unauthorized(auth_error_msg);
          }
        }
        const password_hash = await common.hash_password(iin);
        
        const user_data = {
          name: plt_data.name,
          lastname: plt_data.lastname,
          middlename: plt_data.middlename,
          username: iin,
          password: password_hash,
        };

        const user_id = await db.create_row("users", user_data);

        console.log('trying to select role...');
        let role_data;
        
        if(flag_as_tutor){
          role_data = {
            user_id,
            role: "plt_tutor",
            assotiated_id: plt_data.tutor_id
          }
          const tutorCafedra = await plt.get_tutor_cafedra_by_iin(iin);
          cafedraname = tutorCafedra.cafedraNameRU;
          cafedraid = tutorCafedra.cafedraid;
          console.log('cafedra name:',cafedraname);
          kpi_data = {
            userid: user_id,
            score: 0,
            cafedra: cafedraid
          }
          console.log('role selected: tutor');
          // have to find end set tutor's cafedra
          await db.create_row("kpi_scores",kpi_data);
        }
        else{
          role_data = {
            user_id,
            role: "plt_student",
            assotiated_id: plt_data.student_id
          }
          console.log('role selected: student');
        }
        await db.create_row("roles", role_data);
      }
      user_data = await db.find_user_by_username(iin);
      user_role = await db.get_role_by_iin(iin);
      const role_str = user_role.role;
      console.log(role_str);
      if (!user_data) return reply.unauthorized(auth_error_msg);

      //const match = await bcrypt.compare(payload.password, user_data.password);
      //const match = payload.password === user_data.password;
      const match = await common.compare_passwords(payload.password, user_data.password);
      if (!match) return reply.unauthorized(auth_error_msg);

      // пароль?
      const min_data = { id: user_data.id, username: user_data.username };
      const token = await common.sign_token(min_data);
      let KPIScore, user_id, update;
      if(role_str=='plt_tutor'){
        let tutorCafedra = await plt.get_tutor_cafedra_by_iin(iin);
        cafedraname = tutorCafedra.cafedraNameRU;
        cafedraid = tutorCafedra.cafedraid;
        user_id = await db.get_user_id_by_iin(iin);
        user_id = user_id.id;
        console.log('trying to find and update tutor\'s KPI');
        update = await db.update_kpi_for_user(user_id);
        KPIScore = await db.get_kpiscore_by_userid(user_id);
        KPIScore = KPIScore.score;
        console.log('KPI counted:',KPIScore);
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