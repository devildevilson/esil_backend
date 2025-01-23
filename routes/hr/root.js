const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_photo_deletion = "Фото успешно удалено";


module.exports = [
  {
    method: 'GET',
    path: '/employeelist',
    handler: async function (request, reply) {
      const employees = await plt.get_employees_for_hr();
      return employees;
    },
  },
  {
    method: 'GET',
    path: '/tutorlistpenalty',
    handler: async function (request, reply) {
      const tutors = await db.get_tutors_penalty_list();
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/tutorlistcsei',
    handler: async function (request, reply) {
      const tutors = await db.get_tutors_CSEI_list();
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/createpenalty',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const penalty_type = params.penalty_type;
      const penalty_record = await db.find_penalty_record_for_current_month(userid);
      if(!penalty_record){
        if (penalty_type == 'penalty_ed'){
          let data;
          data = {
            userid: userid, 
            penalty_ed: 1,
            relevant_date: common.human_date(new Date())
          };
        }
        else if (penalty_type == 'penalty_hr'){
          data = {
            userid: userid, 
            penalty_hr: 1,
            relevant_date: common.human_date(new Date())
          };
        }
        await db.create_row("tutor_penalties", data);
      }
      else{
        await db.update_existing_penalty_record(userid,penalty_type,1);
      }
      return 'success';
    },
  },
  {
    method: 'GET',
    path: '/deletepenalty',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const penalty_type = params.penalty_type;
      await db.update_existing_penalty_record(userid,penalty_type,0);
      return 'success';
    },
  },
  {
    method: 'GET',
    path: '/approvegrants',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
      if(!tutordata) {
        const empty_data = {
          userid: userid, 
          relevant_date: common.human_date(new Date())
        };
        await db.create_row("cafedra_bonus_general", empty_data);
      }
      await db.update_CSEI_data(userid,1);
      return 'success';
    },
  },
  {
    method: 'GET',
    path: '/denygrants',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      await db.update_CSEI_data(userid,0);
      return 'success';
    },
  },
];