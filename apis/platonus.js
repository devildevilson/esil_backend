'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");

const connection_config = {
  host     : process.env.PLT_DATABASE_HOST,
  port     : process.env.PLT_DATABASE_PORT,
  user     : process.env.PLT_DATABASE_USER,
  password : process.env.PLT_DATABASE_PASSWORD,
  database : process.env.PLT_DATABASE_NAME,
  connectionLimit: 10,
  connectTimeout: 100000,
};

// как закрыть то елы палы
const pool = mysql.createPool(connection_config);

const db = {
  close: async () => {

  },

  find_student_data_for_certificate: async (student_id) => {
    const query_str = `
      SELECT 
        s.firstname,
        s.lastname,
        s.patronymic,
        s.iinplt AS iin,
        s.StartDate AS start_date,
        s.BirthDate AS birth_date,
        s.StudyFormID AS study_form_id,
        sf.NameRu AS study_form_name_ru,
        sf.NameKz AS study_form_name_kz,
        spec.specializationCode AS specialization_code,
        spec.nameru AS specialization_name_ru,
        spec.namekz AS specialization_name_kz,
        s.grant_type AS grant_type,
        sf.courseCount AS course_count,
        s.CourseNumber AS course_number
      FROM students s
      JOIN studyforms sf ON sf.Id = s.StudyFormID
      JOIN specializations spec ON spec.id = s.specializationID
      WHERE StudentID = ${student_id};
    `;

    const [ res ] = await pool.query(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },


};

module.exports = db;