const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const mdl = require('@apis/moodle');
const bcrypt = require("bcryptjs");
const fs = require('fs').promises;

const DASHBOARD_PASS = process.env.DASHBOARD_PASS;

const validate = (pass) =>{
  if (pass === DASHBOARD_PASS) return true;
  else false;
}

module.exports = [
  {
    method: 'GET',
    path: '/generate/cloud',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const cloud_data = await db.get_dashboard_data();
        return cloud_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/attendance',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const params = request.query;
        const firstname = params.lastname;
        const attendance_data = await db.get_attendance_data_by_lastname(firstname,1000);
        return attendance_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }     
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/attendance/students',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const date = new Date()
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
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
        const attendance_data = await db.get_student_attendance_data_for_prev_month(previousmonth,previousyear);
        return attendance_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }     
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/attendance/employee',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const params = request.query;
        const iin = params.iin;
        const attendance_data = await db.get_attendance_data_by_iin_employee(iin,1000);
        return attendance_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
    
  },
  {
    method: 'GET',
    path: '/generate/attendance/specialties',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const date = new Date()
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
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
        const attendance_data = await db.get_attendance_data_specialties(previousmonth, previousyear);
        for(row of attendance_data){
          const studentcount = await plt.get_student_count_by_specialization(row.department);
          row.maxcount = studentcount;
          const percentage = (row.count/studentcount * 100).toFixed(2);
          if (percentage > 100) row.percentage = 'Ожидание зачисления студентов';
          else row.percentage = percentage + '%';
          // 🥺👉👈
        }
        return attendance_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
    
  },
  {
    method: 'GET',
    path: '/generate/moodle/tests',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const term = request.query.term;
        if (term != 1 && term != 2) return reply.unauthorized('Term accepted values are 1, 2');
        const tests_data = await mdl.get_moodle_tests_data(term);
        return tests_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/moodle/files',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const term = request.query.term;
        if (term != 1 && term != 2) return reply.unauthorized('Term accepted values are 1, 2');
        const tests_data = await mdl.get_moodle_files_data(term);
        return tests_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/moodle/percentage',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const term = request.query.term;
        if (term != 1 && term != 2) return reply.unauthorized('Term accepted values are 1, 2');
        const tests_data = await mdl.get_moodle_files_data_cafedras(term);
        return tests_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/platonus/student',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const plt_data = await plt.generate_dashboard_data_student();
        return plt_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/platonus',
    handler: async function (request, reply) {
      const pass = request.query.pass;
      if (pass === DASHBOARD_PASS) {
        const plt_data = await plt.generate_dashboard_data_tutor();
        return plt_data;
      }
      else {
        return reply.unauthorized('Access denied');
      }
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/students',
    handler: async function (request, reply) {
      if(await validate(request.query.pass) != true) return reply.unauthorized('Access denied');
      const query_str = `SELECT a.lastname AS 'Фамилия'
      , a.firstname AS 'Имя'
      , a.patronymic AS 'Отчество'
      , a.BirthDate AS 'Дата рождения'
      , (YEAR(CURRENT_DATE)-YEar(a.BirthDate))-(RIGHT(CURRENT_DATE,5)<RIGHT(a.BirthDate,5)) as 'возраст'
      , if(s.NAMERU IS NOT NULL, s.NameRu, "") AS 'Пол'
      , if(n.NameRU IS NOT NULL, n.NameRu, "") AS 'Национальность'
      , if(cc.nameru IS NOT NULL, cc.nameru, "") AS 'Гражданство'
      , a.adress AS 'Адрес прописки'
      , a.living_adress 'Адрес проживания'
      , ck.nameru  AS 'Населенный пункт, проживания'
      , a.city AS 'Населенный пункт, откуда прибыл'
      , stud.from_region AS 'Районный центр, откуда прибыл'
      , CASE 
        WHEN end_school = 1 THEN 'Школа'
        WHEN end_college = 1 THEN 'Колледж'
        WHEN end_high_school = 1 THEN 'ВУЗ'
        WHEN end_other = 1 THEN 'Другое'
        END AS 'Окончил'
      , stud.from_area AS 'Область' 
      , a.phone AS 'Телефон'
      , a.mail AS 'E-mail'
      , a.iinplt AS 'ИИН'
      , if(gr.name IS NOT NULL, gr.name, "") AS 'Группа'
      , a.coursenumber as 'Курс'
      , sf.coursecount as 'Кол-во курсов'
      , a.sum_points 'Баллы ЕНТ'
      , if(sl.NameRu IS NOT NULL, sl.NameRu, "") AS 'Язык обучения'
      , if(sf.NameRu IS NOT NULL, sf.NameRu, "") AS 'Форма обучения'     
      , if(concat(prof.code, ' - ', prof.professionNameRU) IS NOT NULL, concat(prof.code, ' - ', prof.professionNameRU), "") AS 'ГОП'
      , IF (CONCAT(spec.specializationCode, ' - ', spec.nameru) IS NOT NULL, CONCAT(spec.specializationCode, ' - ', spec.nameru), "") AS 'ОП'
      
      , c.cafedraNameRU AS 'Кафедра'
      
      , f.facultyNameRU AS 'Факультет'     
      
      , if(pf.NameRu IS NOT NULL, pf.NameRu, "") AS 'Форма оплаты'
      , if(b.nameru IS NOT NULL, b.nameru, "Нет") AS 'Льготы'
      , a.StartDate as 'Дата приема'        
      , hj.nameru
      , a.job_place
      , if(a.altynBelgi != 0, "Да", "Нет") AS 'Алтын белгы'
     
      , a.GPA
      , JSON_ARRAYAGG(o.ordername) as 'приказы'
      , JSON_ARRAYAGG(o.categoryID) as 'category'
      , oc.nameru as 'тип приказа'
      , a.grantnumber
 
 FROM students AS a
 LEFT JOIN student_info AS stud
 ON a.StudentID = stud.studentID
 left join has_jobs hj on a.has_job = hj.id
 
 LEFT JOIN benefits b ON stud.benefit_quota_id = b.id
 
 LEFT JOIN sexes AS s
 ON a.SexID = s.Id
 
 LEFT JOIN center_nationalities AS n
 ON a.NationID = n.Id
 
 LEFT JOIN center_countries AS cc
 ON a.sitizenshipID = cc.id
 
 LEFT JOIN center_kato ck
 ON a.living_place = ck.code
 
 LEFT JOIN studyforms AS sf
 ON a.StudyFormID = sf.Id
 LEFT JOIN paymentforms AS pf
 ON a.PaymentFormID = pf.Id
 LEFT JOIN studylanguages AS sl
 ON a.StudyLanguageID = sl.Id
 LEFT JOIN professions AS prof
 ON a.ProfessionID = prof.professionID
 
 LEFT JOIN specializations AS spec
 ON a.specializationID = spec.id
 
 LEFT JOIN profession_cafedra pc 
 ON pc.id = spec.prof_caf_id
 
 LEFT JOIN cafedras c ON pc.cafedraID = c.cafedraID
 
 LEFT JOIN faculties f ON f.FacultyID = c.FacultyID
 
 LEFT JOIN nitro.groups AS gr
 ON a.groupID = gr.groupID
 
 left JOIN ordersadditional oa on oa.studentID = a.StudentID
 left join orders o on o.orderID = oa.orderID
 left join ordercategories oc on oc.id = o.categoryID
 
 WHERE a.isstudent = 1 
 group BY a.StudentID;`;
      return await plt.generic_query(query_str);
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/tutors_thisyear',
    handler: async function (request, reply) {
      if(await validate(request.query.pass) != true) return reply.unauthorized('Access denied');
      const date = new Date();
      let year = date.getFullYear();
      if ((date.getMonth() + 1) < 9) year-=1;
      const query_str = `select 
      tc.id as tutorid
      , t.iinplt 
      , t.lastname 
      , t.firstname 
      , t.patronymic 
      , t.sexid 
      , cas.id as academic_status_id
      , cas.nameru as academic_status_name_ru
  /*    , cas.namekz as academic_status_name_kz
      , cas.nameen as academic_status_name_en*/
      , sd.id as scientific_degree_id
      , sd.nameru  as scientific_degree_name_ru
    /*  , sd.namekz  as scientific_degree_name_kz
      , sd.nameen as scientific_degree_name_en*/
      , cc.id as citizenship_id
      , cc.nameru  as citizenship_name_ru
    /*  , cc.namekz as citizenship_name_kz
      , cc.nameen as citizenship_name_en*/
      , tc.type as work_status_id
      , tc.deleted as fired
      , eo2.date as employ_order_date
      , eo.date as fire_order_date
      , tp.id as position_id
      , tp.nameru  as position_name_ru
     /* , tp.namekz as position_name_kz
      , tp.nameen as position_name_en*/
      , tp.chief_position as position_chief
      , t.scopusID
      , t.webOfScienceID
      , GROUP_CONCAT(concat(ctd.code_direction," ",ctd.name_ru)) as training_direction_code
     , GROUP_CONCAT(ca.namekz) as honoured_coach
      , GROUP_CONCAT(cat.nameru) as has_state_award
  
  from tutors t
            join tutor_cafedra tc on  t.tutorid = tc.tutorid
            join tutor_positions tp on  tc.position = tp.id
            join tutor_cafedra_training_directions tctd on  tc.id  = tctd.tutor_cafedra_id
            join center_training_directions ctd on tctd.training_direction_id = ctd.id
           left join academicstatus acs on t.academicstatusid = acs.id
           left join center_academicstatus cas on acs.status_id = cas.id
           left join scientificdegree sd on  t.scientificdegreeid = sd.id
           left join center_countries cc on t.citizenshipid = cc.id
           left join tutor_awards ta on  t.tutorid = ta.tutorid
           left join awards a on  ta.honorarytitleid = a.id
           left join center_awards ca on ca.id = a.status_id
           left join center_award_types cat on cat.id = ca.awardtypeid
           left join employee_orders eo on  t.tutorid = eo.tutor_id and eo.type_id = 2
           left join employee_orders eo2 on  t.tutorid = eo2.tutor_id and eo2.type_id = 1
  where
    (t.maternity_leave is null or t.maternity_leave = false)
    and tc.type in (0,1,2)
    and (tc.deleted is null or tc.deleted = false or tc.deleted = true and eo.date >= '${year}-01-01' and eo.date <= '${year}-12-31')
   
  group by tc.id, t.iinplt , t.lastname , t.firstname , t.patronymic , t.sexid ,
           cas.id, cas.nameru, cas.namekz, cas.nameen,
           sd.id, sd.nameru, sd.namekz, sd.nameen,
           cc.id, cc.nameru, cc.namekz, cc.nameen,
           tc.type, tc.deleted, eo2.date, eo.date,
           tp.id, tp.nameru, tp.namekz, tp.nameen, tp.chief_position;`;
      return await plt.generic_query(query_str);
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/staff_thisyear',
    handler: async function (request, reply) {
      if(await validate(request.query.pass) != true) return reply.unauthorized('Access denied');
      const date = new Date();
      let year = date.getFullYear();
      if ((date.getMonth() + 1) < 9) year-=1;
      const query_str = `select 
      tc.id as tutorid
      , t.iinplt 
      , t.lastname 
      , t.firstname 
      , t.patronymic 
      , t.sexid 
      , cas.id as academic_status_id
      , cas.nameru as academic_status_name_ru
  /*    , cas.namekz as academic_status_name_kz
      , cas.nameen as academic_status_name_en*/
      , sd.id as scientific_degree_id
      , sd.nameru  as scientific_degree_name_ru
    /*  , sd.namekz  as scientific_degree_name_kz
      , sd.nameen as scientific_degree_name_en*/
      , cc.id as citizenship_id
      , cc.nameru  as citizenship_name_ru
    /*  , cc.namekz as citizenship_name_kz
      , cc.nameen as citizenship_name_en*/
      , tc.type as work_status_id
      , tc.deleted as fired
      , eo2.date as employ_order_date
      , eo.date as fire_order_date
      , tp.id as position_id
      , tp.nameru  as position_name_ru
     /* , tp.namekz as position_name_kz
      , tp.nameen as position_name_en*/
      , tp.chief_position as position_chief
      , t.scopusID
      , t.webOfScienceID
      , GROUP_CONCAT(concat(ctd.code_direction," ",ctd.name_ru)) as training_direction_code
     , GROUP_CONCAT(ca.namekz) as honoured_coach
      , GROUP_CONCAT(cat.nameru) as has_state_award
  
  from tutors t
            join tutor_cafedra tc on  t.tutorid = tc.tutorid
            join tutor_positions tp on  tc.position = tp.id
            join tutor_cafedra_training_directions tctd on  tc.id  = tctd.tutor_cafedra_id
            join center_training_directions ctd on tctd.training_direction_id = ctd.id
           left join academicstatus acs on t.academicstatusid = acs.id
           left join center_academicstatus cas on acs.status_id = cas.id
           left join scientificdegree sd on  t.scientificdegreeid = sd.id
           left join center_countries cc on t.citizenshipid = cc.id
           left join tutor_awards ta on  t.tutorid = ta.tutorid
           left join awards a on  ta.honorarytitleid = a.id
           left join center_awards ca on ca.id = a.status_id
           left join center_award_types cat on cat.id = ca.awardtypeid
           left join employee_orders eo on  t.tutorid = eo.tutor_id and eo.type_id = 2
           left join employee_orders eo2 on  t.tutorid = eo2.tutor_id and eo2.type_id = 1
  where
    (t.maternity_leave is null or t.maternity_leave = false)
    and tc.type in (0,1,2)
    and (tc.deleted is null or tc.deleted = false or tc.deleted = true and eo.date >= '${year}-01-01' and eo.date <= '${year}-12-31')
   
  group by tc.id, t.iinplt , t.lastname , t.firstname , t.patronymic , t.sexid ,
           cas.id, cas.nameru, cas.namekz, cas.nameen,
           sd.id, sd.nameru, sd.namekz, sd.nameen,
           cc.id, cc.nameru, cc.namekz, cc.nameen,
           tc.type, tc.deleted, eo2.date, eo.date,
           tp.id, tp.nameru, tp.namekz, tp.nameen, tp.chief_position;`;
      return await plt.generic_query(query_str);
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/applicants_nextyear',
    handler: async function (request, reply) {
      if(await validate(request.query.pass) != true) return reply.unauthorized('Access denied');
      const date = new Date();
      let year = date.getFullYear();
      if ((date.getMonth() + 1) < 9) year-=1;
      const query_str = `SELECT a.lastname AS 'Фамилия'
      , a.firstname AS 'Имя'
      , a.patronymic AS 'Отчество'
      , a.BirthDate AS 'Дата рождения'
      , (YEAR(CURRENT_DATE)-YEar(a.BirthDate))-(RIGHT(CURRENT_DATE,5)<RIGHT(a.BirthDate,5)) as 'возраст'
      , if(s.NAMERU IS NOT NULL, s.NameRu, "") AS 'Пол'
      , if(n.NameRU IS NOT NULL, n.NameRu, "") AS 'Национальность'
      , if(cc.nameru IS NOT NULL, cc.nameru, "") AS 'Гражданство'
      , a.adress AS 'Адрес прописки'
      , a.living_adress 'Адрес проживания'
      , ck.nameru  AS 'Населенный пункт, проживания'
      , a.city AS 'Населенный пункт, откуда прибыл'
      , stud.from_region AS 'Районный центр, откуда прибыл'
      , stud.from_area AS 'Область' 
      , a.phone AS 'Телефон'
      , a.mail AS 'E-mail'
      , a.iinplt AS 'ИИН'
      , if(gr.name IS NOT NULL, gr.name, "") AS 'Группа'
      , if(sl.NameRu IS NOT NULL, sl.NameRu, "") AS 'Язык обучения'
      , if(sf.NameRu IS NOT NULL, sf.NameRu, "") AS 'Форма обучения'     
      , if(concat(prof.code, ' - ', prof.professionNameRU) IS NOT NULL, concat(prof.code, ' - ', prof.professionNameRU), "") AS 'ГОП'
      , IF (CONCAT(spec.specializationCode, ' - ', spec.nameru) IS NOT NULL, CONCAT(spec.specializationCode, ' - ', spec.nameru), "") AS 'ОП'
      
      , c.cafedraNameRU AS 'Кафедра'
      
      , f.facultyNameRU AS 'Факультет'     
      
      , if(pf.NameRu IS NOT NULL, pf.NameRu, "") AS 'Форма оплаты'
      , if(b.nameru IS NOT NULL, b.nameru, "Нет") AS 'Льготы'
      , a.StartDate as 'Дата приема'        
      , hj.nameru
      , a.job_place
      , if(a.altynBelgi != 0, "Да", "Нет") AS 'Алтын белгы'
     
      , a.GPA
      , JSON_ARRAYAGG(o.ordername) as 'приказы'
      , JSON_ARRAYAGG(o.categoryID) as 'category'
      , oc.nameru as 'тип приказа'
      , a.grantnumber
 
 FROM students AS a
 LEFT JOIN student_info AS stud
 ON a.StudentID = stud.studentID
 left join has_jobs hj on a.has_job = hj.id
 
 LEFT JOIN benefits b ON stud.benefit_quota_id = b.id
 
 LEFT JOIN sexes AS s
 ON a.SexID = s.Id
 
 LEFT JOIN center_nationalities AS n
 ON a.NationID = n.Id
 
 LEFT JOIN center_countries AS cc
 ON a.sitizenshipID = cc.id
 
 LEFT JOIN center_kato ck
 ON a.living_place = ck.code
 
 LEFT JOIN studyforms AS sf
 ON a.StudyFormID = sf.Id
 LEFT JOIN paymentforms AS pf
 ON a.PaymentFormID = pf.Id
 LEFT JOIN studylanguages AS sl
 ON a.StudyLanguageID = sl.Id
 LEFT JOIN professions AS prof
 ON a.ProfessionID = prof.professionID
 
 LEFT JOIN specializations AS spec
 ON a.specializationID = spec.id
 
 LEFT JOIN profession_cafedra pc 
 ON pc.id = spec.prof_caf_id
 
 LEFT JOIN cafedras c ON pc.cafedraID = c.cafedraID
 
 LEFT JOIN faculties f ON f.FacultyID = c.FacultyID
 
 LEFT JOIN nitro.groups AS gr
 ON a.groupID = gr.groupID
 
 left JOIN ordersadditional oa on oa.studentID = a.StudentID
 left join orders o on o.orderID = oa.orderID
 left join ordercategories oc on oc.id = o.categoryID
 
 WHERE a.isstudent = 2 and a.enroll_order_date BETWEEN "${year+1}-03-01" and "${year+1}-08-30" 
 group BY a.StudentID;`;
      return await plt.generic_query(query_str);
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/graduate_thisyear',
    handler: async function (request, reply) {
      if(await validate(request.query.pass) != true) return reply.unauthorized('Access denied');
      const date = new Date();
      let year = date.getFullYear();
      if ((date.getMonth() + 1) < 9) year-=1;
      const query_str = `SELECT a.lastname AS 'Фамилия'
      , a.firstname AS 'Имя'
      , a.patronymic AS 'Отчество'
      , a.BirthDate AS 'Дата рождения'
      , (YEAR(CURRENT_DATE)-YEar(a.BirthDate))-(RIGHT(CURRENT_DATE,5)<RIGHT(a.BirthDate,5)) as 'возраст'
      , if(s.NAMERU IS NOT NULL, s.NameRu, "") AS 'Пол'
      , if(n.NameRU IS NOT NULL, n.NameRu, "") AS 'Национальность'
      , a.sitizenshipID
      , if(cc.nameru IS NOT NULL, cc.nameru, "") AS 'Гражданство'
      , a.adress AS 'Адрес прописки'
      , a.living_adress 'Адрес проживания'
      , ck.nameru  AS 'Населенный пункт, проживания'
      , a.city AS 'Населенный пункт, откуда прибыл'
      , stud.from_region AS 'Районный центр, откуда прибыл'
      , stud.from_area AS 'Область' 
      , a.phone AS 'Телефон'
      , a.mail AS 'E-mail'
      , a.iinplt AS 'ИИН'
      , if(gr.name IS NOT NULL, gr.name, "") AS 'Группа'
      , if(sl.NameRu IS NOT NULL, sl.NameRu, "") AS 'Язык обучения'
      , dt.nameru as 'Академическая степень'
      , if(sf.NameRu IS NOT NULL, sf.NameRu, "") AS 'Форма обучения'     
      , if(concat(prof.code, ' - ', prof.professionNameRU) IS NOT NULL, concat(prof.code, ' - ', prof.professionNameRU), "") AS 'ГОП'
      , IF (CONCAT(spec.specializationCode, ' - ', spec.nameru) IS NOT NULL, CONCAT(spec.specializationCode, ' - ', spec.nameru), "") AS 'ОП'
      
      , c.cafedraNameRU AS 'Кафедра'
      
      , f.facultyNameRU AS 'Факультет'     
      
      , if(pf.NameRu IS NOT NULL, pf.NameRu, "") AS 'Форма оплаты'
      , if(b.nameru IS NOT NULL, b.nameru, "Нет") AS 'Льготы'
      , a.StartDate as 'Дата приема'   
      , g.finishOrderDate as 'Дата выпуска' 
      , hj.nameru as 'Трудоустроен'
      , a.job_place as 'Куда трудоустроен'
      , o.ordername as 'приказ'
      , o.ordernumber as 'номер приказа'
      , g.isHonoursDiploma as 'тип диплома'
 
 FROM
  graduates as g
 
 LEFT JOIN
   students AS a
 On a.StudentID = g.studentID
 LEFT JOIN student_info AS stud
 ON a.StudentID = stud.studentID
 left join has_jobs hj on a.has_job = hj.id
 
 LEFT JOIN benefits b ON stud.benefit_quota_id = b.id
 
 LEFT JOIN sexes AS s
 ON a.SexID = s.Id
 
 LEFT JOIN center_nationalities AS n
 ON a.NationID = n.Id
 
 LEFT JOIN center_countries AS cc
 ON a.sitizenshipID = cc.id
 
 LEFT JOIN center_kato ck
 ON a.living_place = ck.code
 
 LEFT JOIN studyforms AS sf
 ON a.StudyFormID = sf.Id
 LEFT JOIN paymentforms AS pf
 ON a.PaymentFormID = pf.Id
 LEFT JOIN studylanguages AS sl
 ON a.StudyLanguageID = sl.Id
 LEFT JOIN professions AS prof
 ON a.ProfessionID = prof.professionID
 
 LEFT JOIN specializations AS spec
 ON a.specializationID = spec.id
 
 LEFT JOIN profession_cafedra pc 
 ON pc.id = spec.prof_caf_id
 
 LEFT JOIN cafedras c ON pc.cafedraID = c.cafedraID
 
 LEFT JOIN faculties f ON f.FacultyID = c.FacultyID
 
 left join degree_types dt on dt.degreeID = sf.degreeID
 
 LEFT JOIN nitro.groups AS gr
 ON a.groupID = gr.groupID
 LEft join orderstudentinfo osi on a.StudentID = osi.studentID 
 Left join orders o on o.orderID = osi.orderID
 WHERE
  (YEAR(g.finishOrderDate) BETWEEN ${year} and ${year})  
 GROUP by a.StudentID;`;
      return await plt.generic_query(query_str);
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
  {
    method: 'GET',
    path: '/generate/academicmobil_lastyear',
    handler: async function (request, reply) {
      if(await validate(request.query.pass) != true) return reply.unauthorized('Access denied');
      const date = new Date();
      let year = date.getFullYear();
      if ((date.getMonth() + 1) < 9) year-=1;
      const query_str = `SELECT s.lastname
      , s.firstname
      , s.patronymic
      , orders.ordername
      , orders.ordernumber
      , orders.orderID
      , ordertype
      , oam.mobilityType
      , oam.startdate
      , oam.finishdate
       from students s join ordersacademicmobility oam on oam.studentID = s.StudentID
      join orders on orders.orderID = oam.orderID
      WHERE 
      ordertype = 30 and oam.mobilityType = 2 and 
      oam.startdate BETWEEN '${year-1}-09-01' and '${year}-06-30';`;
      return await plt.generic_query(query_str);
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "pass" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
];