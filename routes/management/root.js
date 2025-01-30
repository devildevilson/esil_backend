const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const mdl = require('@apis/moodle');
const fs = require('fs').promises;


const successful_upload = "";

module.exports = [
  {
    method: 'GET',
    path: '/gettutorsbycafedra',
    handler: async function (request, reply) {
      const params = request.query;
      const cafedraid = params.cafedraid;
      const tutors = await db.get_tutors_by_cafedra_id_for_manager(cafedraid);
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/gettutorsbyfaculty',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const tutors = await db.get_tutors_by_faculty(userid);
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/suspendtutor',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const tutors = await db.suspend_tutor(userid);
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/getbonuspoints',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const tutor = await plt.find_tutor_by_iin(iin.iin);
      const tutorid = tutor.plt_id;
      const percentage = await mdl.calculate_percentage_by_tutorid(tutorid);
      const points_db = await db.get_bonus_points_by_id(userid);
      const points_plt_pubs = await plt.get_tutorpubs(iin.iin);
      const points_plt_literature = await plt.get_tutorliterature(iin.iin);
      const tutor_penalties = await db.find_penalty_record_for_current_month(userid);
      let penalty_score = 0;
      if (tutor_penalties) {
        if(tutor_penalties.penalty_hr == 1) penalty_score -=1;
        if(tutor_penalties.penalty_ed == 1) penalty_score -=1;
      }
      let moodle_points = 0;
      if (percentage > -1) if (percentage > 99) moodle_points = 1;
      return points_db + points_plt_pubs + points_plt_literature + moodle_points + penalty_score;
    },
  },
  {
    method: 'GET',
    path: '/getalltutordata',
    handler: async function (request, reply) {
      const params = request.query;
      const month_query = params.month_query;
      const date = new Date();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      let tutordata;
      if (month_query == 'previous'){
        let previousmonth = 1;
        let previousyear = 1;
        if (month != 1){ 
          previousmonth = month - 1;
          previousyear = year;
        }
        else {
          previousmonth = 12;
          previousyear = year - 1;
        }
        tutordata = await db.get_tutor_bonus_data_userids(previousmonth,previousyear);
      }
      else {
        tutordata = await db.get_tutor_bonus_data_userids(month,year);
      }
      let final_arr = [];
      for (const user of tutordata){  
        const iin = await db.get_iin_by_user_id(user.userid);
        const cafedra = await db.get_tutor_cafedra_by_id(user.userid);
        const tutor = await plt.find_tutor_by_iin(iin.iin);
        if (!tutor) continue;
        const tutorid = tutor.plt_id;
        const percentage = await mdl.calculate_percentage_by_tutorid(tutorid);
        let points_db = 0;
        if (month_query == 'previous') points_db = await db.get_bonus_points_by_id_prevmonth(user.userid);
        else points_db = await db.get_bonus_points_by_id(user.userid);
        const points_plt_pubs = await plt.get_tutorpubs(iin.iin);
        const points_plt_literature = await plt.get_tutorliterature(iin.iin);
        let moodle_points = 0;
        if (percentage > -1) if (percentage > 99) moodle_points = 1;
        let tutor_penalties;
        if (month_query == 'previous') tutor_penalties = await db.find_penalty_record_for_previous_month(user.userid);
        else tutor_penalties = await db.find_penalty_record_for_current_month(user.userid);
        let penalty_score = 0;
        if (tutor_penalties) {
          if(tutor_penalties.penalty_hr == 1) penalty_score -=1;
          if(tutor_penalties.penalty_ed == 1) penalty_score -=1;
        }
        const finalscore = points_db + points_plt_pubs + points_plt_literature + moodle_points + penalty_score;
        final_arr.push({"userid":user.userid, "fio":tutor.lastname+' '+tutor.name+' '+tutor.middlename, "cafedra":cafedra, "score":finalscore,"bonus": await db.get_bonus_level(finalscore)});
      }
      
      const sortedData = final_arr.sort((a, b) => b.score - a.score);

      return sortedData;
    },
  },
  {
    method: 'GET',
    path: '/gettutordata',
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
        return await db.get_tutor_bonus_data_by_user_id(userid);
      }
      return tutordata;
    },
  },
  {
    method: 'GET',
    path: '/gettutormoodlepercentage',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const tutor = await plt.find_tutor_by_iin(iin.iin);
      const tutorid = tutor.plt_id;
      const percentage = await mdl.calculate_percentage_by_tutorid(tutorid);
      return percentage;
    },
  },
  {
    method: 'GET',
    path: '/gettutorpubdata',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const score = await plt.get_tutorpubs(iin.iin);
      return score;
    },
  },
  {
    method: 'GET',
    path: '/gettutorliteraturedata',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const score = await plt.get_tutorliterature(iin.iin);
      return score;
    },
  },
  {
    method: 'GET',
    path: '/gettutordataproforientation',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const tutordata = await db.get_tutor_proforientation_data_by_user_id(userid);
      if(!tutordata) {
        const empty_data = {
          userid: userid,
          relevant_date: common.human_date(new Date())
        };
        await db.create_row("cafedra_bonus_proforientation", empty_data);
        return await db.get_tutor_proforientation_data_by_user_id(userid).proforientation_student_count;
      }
      return tutordata.proforientation_student_count;
    },
  }, 
  {
    method: 'GET',
    path: '/confirmtutorfile',
    handler: async function (request, reply) {
      const params = request.query;
      const confirmed_by = params.confirmed_by;
      const confirmed_for = params.confirmed_for;
      const category = params.category;
      await db.confirm_if_category_unconfirmed(confirmed_for, category);
      return { message: `Confirmed category ${category} for userid ${confirmed_for} by ${confirmed_by}` };
    },
  },
  {
    method: 'GET',
    path: '/confirmtutorcategory',
    handler: async function (request, reply) {
      const params = request.query;
      const confirmed_by = params.confirmed_by;
      const confirmed_for = params.confirmed_for;
      const category = params.category;
      await db.confirm_if_fileless_category_unconfirmed(confirmed_for, category);
      return { message: `Confirmed category ${category} for userid ${confirmed_for} by ${confirmed_by}` };
    },
  },
  
];