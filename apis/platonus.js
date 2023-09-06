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

const query_f = (str) => pool.query(str);
const transaction_f = async (callback) => {
  const con = await pool.getConnection();
  await con.beginTransaction();
  const out = await callback(con);
  await con.commit();
  con.release();
  return out;
};

const last_insert_id_f = async (con) => { const [ [ { id } ] ] = await con.query("SELECT LAST_INSERT_ID() AS id"); return id; }
const row_count_f = async (con) => { const [ [ { count } ] ] = await con.query("SELECT ROW_COUNT() AS count"); return count; }

const db = {
  close: async () => {
    await pool.end();
  },

  find_student_data_for_certificate: async (student_id) => {
    const query_str = `
      SELECT 
        s.firstname AS name,
        s.lastname,
        s.patronymic AS middlename,
        s.iinplt AS iin,
        s.StartDate AS start_date,
        s.BirthDate AS birth_date,
        s.StudyFormID AS study_form_id,
        spec.specializationCode AS specialization_code,
        s.grant_type AS grant_type,
        sf.courseCount AS course_count,
        s.CourseNumber AS course_number,
        sf.NameRu AS study_form_name_ru,
        sf.NameKz AS study_form_name_kz,
        sf.NameEn AS study_form_name_en,
        spec.nameru AS specialization_name_ru,
        spec.namekz AS specialization_name_kz,
        spec.nameen AS specialization_name_en,
        c.cafedraNameRU AS cafedra_ru,
        f.facultyNameRU AS dekanat_ru,
        c.cafedraNameKZ AS cafedra_kz,
        f.facultyNameKZ AS dekanat_kz,
        c.cafedraNameEN AS cafedra_en,
        f.facultyNameEN AS dekanat_en
      FROM students s
      JOIN studyforms sf ON sf.Id = s.StudyFormID
      JOIN specializations spec ON spec.id = s.specializationID
      JOIN profession_cafedra pc ON spec.prof_caf_id = pc.id
      JOIN cafedras c ON pc.cafedraID = c.cafedraID
      JOIN faculties f ON c.FacultyID = f.FacultyID
      WHERE StudentID = ${student_id} AND s.isStudent = 1;
    `;

    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },

  find_student_by_iin: async (inn) => {
    const query_str = `SELECT StudentID AS student_id, firstname AS name, lastname, patronymic AS middlename FROM students WHERE iinplt = '${inn}' AND isStudent = 1;`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
};

module.exports = db;