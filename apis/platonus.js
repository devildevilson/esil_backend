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
  get_tutor_cafedra_by_iin: async (iin) => {
    const query_str = `SELECT c.cafedraid, c.cafedraNameRU
    FROM tutors t 
    JOIN tutor_cafedra tc ON t.TutorID = tc.tutorID
    JOIN cafedras c ON tc.cafedraid = c.cafedraID
    WHERE t.deleted = 0 and t.iinplt=${iin};`
    const [ res ] = await query_f(query_str);  
    return res.length !== 0 ? res[0] : undefined;
  },
  find_student_by_iin: async (inn) => {
    const query_str = `SELECT StudentID AS student_id, firstname AS name, lastname, patronymic AS middlename FROM students WHERE iinplt = '${inn}' AND isStudent = 1;`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },

  find_tutor_by_iin: async (inn) => {
    const query_str = `SELECT tutorid AS tutor_id, firstname AS name, lastname, patronymic AS middlename FROM tutors WHERE iinplt = '${inn}' AND has_access = 1;`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_h_index: async(inn) =>{
    const query_str = `select hi.h_index_scopus as hscopus, hi.h_index_wos as hwos from hirsch_index hi
    join tutors t on t.TutorID = hi.tutorID
    where t.iinplt=${inn}`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_pub_count_by_iin_and_edition_index: async (inn,edition_index_db) =>{
    const max_year_gap = 5;
    const today = new Date();
    const current_year = today.getFullYear()
    const query_str = `SELECT count(*) as pubcount FROM tutorpubs tp 
    JOIN tutors t ON t.TutorID = tp.TutorID
    JOIN publication_type pt ON tp.publication_type = pt.id
    JOIN publication_level pl ON tp.publication_level = pl.id
    where tp.edition_year>(${current_year-max_year_gap})
    and tp.edition_index_db='${edition_index_db}'
    and t.iinplt=${inn};`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_kpi_score_by_iin: async (inn) =>{
    const max_year_gap_pub = 5;
    const max_year_gap_nir = 3;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = `SELECT tutorid as tutor_id from tutors where iinplt='${inn}' AND has_access=1;`;
    let [res] = await query_f(query_str);
    let tutor_id = res.length !== 0 ? res[0].tutor_id : undefined;
    console.log('tutorid:',tutor_id); 
    query_str = `
    SELECT tp.pubID, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor' FROM tutorpubs tp 
    JOIN tutors t ON t.TutorID = tp.TutorID
    JOIN publication_type pt ON tp.publication_type = pt.id
    JOIN publication_level pl ON tp.publication_level = pl.id
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>(${current_year-max_year_gap_pub});
    `;
    let [res_pub] = await query_f(query_str);
    console.log('publications parsed');
    let KPICounter = 0;
    if (res_pub.length > 0) {
        for (let i = 0; i < res_pub.length; i++) {
          if (res_pub[i].pubtype == "Научные статьи") {
              if (res_pub[i].publevel == "Международного уровня") {
                  KPICounter += 3;
              }
              else if (res_pub[i].publevel == "Республиканского уровня") {
                  KPICounter += 7;
              }
              if (res_pub[i].impact_factor != null && parseFloat(res_pub[i].impact_factor) > 0) {
                  KPICounter += 10;
              }
          }
          if (res_pub[i].pubtype == "Тезисы(конференция)") {
              if (res_pub[i].publevel == "Международного уровня") {
                  KPICounter += 3;
              }
              else if (res_pub[i].publevel == "Республиканского уровня") {
                  KPICounter += 7;
              }
          }
          if (res_pub[i].pubtype == "Научные монографии") {
              if (res_pub[i].publevel == "Международного уровня") {
                  KPICounter += 3;
              }
              else if (res_pub[i].publevel == "Республиканского уровня") {
                  KPICounter += 7;
              }
          }
          if (res_pub[i].pubtype == "Научные рекомендации") {
              if (res_pub[i].publevel == "Международного уровня") {
                  KPICounter += 3;
              }
              else if (res_pub[i].publevel == "Республиканского уровня") {
                  KPICounter += 7;
              }
          }
          if (res_pub[i].pubtype == "Учебное пособие") {
              if (res_pub[i].publevel == "Международного уровня") {
                  KPICounter += 3;
              }
              else if (res_pub[i].publevel == "Республиканского уровня") {
                  KPICounter += 7;
              }
          }
        }        
        
    }
    query_str = `
    SELECT COUNT(*) as 'total' FROM tutor_inventive_activity tia
    WHERE tia.tutorid = ${tutor_id};
    `;
    let [res_inv] = await query_f(query_str);
    if(res_inv.length>0){
      KPICounter =KPICounter + parseInt(res_inv[0]["total"])*5;
    }
    query_str = `
    SELECT COUNT(*) as 'total' FROM nirs n
    WHERE n.personid = ${tutor_id}
    and n.startdate>'${current_year-max_year_gap_nir}-01-01';
    `;
    let [res_nirs] = await query_f(query_str);
    if(res_nirs.length>0){
      KPICounter =KPICounter + parseInt(res_nirs[0]["total"])*40;
    }
    return KPICounter;
  }

};

module.exports = db;