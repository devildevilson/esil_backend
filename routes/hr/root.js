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
    path: '/tutorlistadmission',
    handler: async function (request, reply) {
      const tutors = await db.get_tutors_proforientation_list();
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
    path: '/tutorlistsciencesec',
    handler: async function (request, reply) {
      const tutors = await db.get_tutors_science_secretary_list();
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/tutorlistephq',
    handler: async function (request, reply) {
      const tutors = await db.get_tutors_EPHQ_list();
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
      return await db.get_tutors_penalty_list();
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
      return await db.get_tutors_penalty_list();
    },
  },
  {
    method: 'GET',
    path: '/approvecsei',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const category = params.category;
      const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
      if(!tutordata) {
        const empty_data = {
          userid: userid, 
          relevant_date: common.human_date(new Date())
        };
        await db.create_row("cafedra_bonus_general", empty_data);
      }
      await db.update_CSEI_data(userid,category,1);
      return await db.get_tutors_CSEI_list();;
    },
  },
  {
    method: 'GET',
    path: '/denycsei',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const category = params.category;
      await db.update_CSEI_data(userid,category,0);
      return await db.get_tutors_CSEI_list();;
    },
  },
  {
    method: 'GET',
    path: '/approvesciencesec',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const category = params.category;
      const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
      if(!tutordata) {
        const empty_data = {
          userid: userid, 
          relevant_date: common.human_date(new Date())
        };
        await db.create_row("cafedra_bonus_general", empty_data);
      }
      await db.update_CSEI_data(userid,category,1);
      return await db.get_tutors_science_secretary_list();
    },
  },
  {
    method: 'GET',
    path: '/denysciencesec',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const category = params.category;
      await db.update_CSEI_data(userid,category,0);
      return await db.get_tutors_science_secretary_list();
    },
  },
  {
    method: 'GET',
    path: '/approvegrantsbulk',
    handler: async function (request, reply) {
      const params = request.query;
      const userids = params.userid.split(',');
      for (const userid of userids) {
        const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
        if (!tutordata) {
          const empty_data = {
            userid: userid,
            relevant_date: common.human_date(new Date())
          };
          await db.create_row("cafedra_bonus_general", empty_data);
        }
        await db.update_CSEI_data(userid, 'grants', 1);
      }
      return { message: 'done' };
    },
  },
  {
    method: 'GET',
    path: '/approvesciencebulk',
    handler: async function (request, reply) {
      const params = request.query;
      const userids = params.userid.split(',');
      for (const userid of userids) {
        const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
        if (!tutordata) {
          const empty_data = {
            userid: userid,
            relevant_date: common.human_date(new Date())
          };
          await db.create_row("cafedra_bonus_general", empty_data);
        }
        await db.update_CSEI_data(userid, 'science_event', 1);
      }
      return { message: 'done' };
    },
  },
  {
    method: 'GET',
    path: '/approveauditoriumbulk',
    handler: async function (request, reply) {
      const params = request.query;
      const userids = params.userid.split(',');
      for (const userid of userids) {
        const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
        if (!tutordata) {
          const empty_data = {
            userid: userid,
            relevant_date: common.human_date(new Date())
          };
          await db.create_row("cafedra_bonus_general", empty_data);
        }
        await db.update_EPHQ_data(userid, 1);
      }
      return { message: 'done' };
    },
  },
  {
    method: 'GET',
    path: '/approveauditorium',
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
      await db.update_EPHQ_data(userid,1);
      return await db.get_tutors_EPHQ_list();
    },
  },
  {
    method: 'GET',
    path: '/denyauditorium',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      await db.update_EPHQ_data(userid,0);
      return await db.get_tutors_EPHQ_list();
    },
  },
];