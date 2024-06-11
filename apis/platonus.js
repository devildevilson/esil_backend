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
  find_student_data_for_application: async (student_id) => {
    const query_str = `
      SELECT 
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s.BirthDate AS birth_date,
        s.iinplt AS iin,
        s.icnumber AS id_card,
        s.icdate AS id_date,
        si.ic_finish_date AS id_thru,
        s.icdepartment AS id_dep,
        s1.NAMERU AS sex,
        ck_bp.nameru AS birth_place,
        s.living_adress AS living_address,
        s.adress AS registration_address,
        ck_lp.nameru AS living_place_kato,
        ck_rp.nameru AS registration_place_kato,
        ck_bp.nameru AS birth_place_kato,
        s.phone AS phone1,
        s.mobilePhone AS phone2,
        --
        s.mail AS email,
        cn.NameRU AS nationality,
        cc.nameru AS citizenship,
        s2.nameru AS specialization,
        sf.NameRu AS study_form,
        dt.nameru AS degree_type,
        --
        sl.NameRU AS study_language,
        --
        s.sum_points AS exam_score,
        --
        i.edunameru AS edu_name,
        ck2.nameru AS edu_place_name,
        s.dorm_state AS dorm
      FROM students s
      LEFT JOIN student_info si ON si.studentID = s.StudentID
      LEFT JOIN sexes s1 ON s1.ID = s.SexID
      LEFT JOIN center_kato ck_bp ON ck_bp.id = s.birth_place_cato_id
      LEFT JOIN center_kato ck_lp ON ck_lp.id = s.living_place_cato_id
      LEFT JOIN center_kato ck_rp ON ck_rp.id = s.registration_place_cato_id
      LEFT JOIN center_nationalities cn ON cn.Id = s.NationID
      LEFT JOIN center_countries cc ON cc.id = s.sitizenshipID
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
      LEFT JOIN degree_types dt ON dt.degreeID = sf.degreeID
      LEFT JOIN studylanguages sl ON sl.Id = s.StudyLanguageID
      LEFT JOIN institutions i ON i.id = si.institution_id
      LEFT JOIN center_kato ck2 ON ck2.code = i.regioncode
      WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },
  find_student_data_for_application_kz: async (student_id) => {
    const query_str = `
      SELECT 
      s.lastname AS lastname,
      s.firstname AS firstname,
      s.patronymic AS patronymic,
      s.BirthDate AS birth_date,
      s.iinplt AS iin,
      s.icnumber AS id_card,
      s.icdate AS id_date,
      si.ic_finish_date AS id_thru,
      s.icdepartment AS id_dep,
      s1.namekz AS sex,
      ck_bp.namekz AS birth_place,
      s.living_adress AS living_address,
      s.adress AS registration_address,
      ck_lp.namekz AS living_place_kato,
      ck_rp.namekz AS registration_place_kato,
      ck_bp.namekz AS birth_place_kato,
      s.phone AS phone1,
      s.mobilePhone AS phone2,
      --
      s.mail AS email,
      cn.namekz AS nationality,
      cc.namekz AS citizenship,
      s2.namekz AS specialization,
      sf.namekz AS study_form,
      dt.namekz AS degree_type,
      --
      sl.namekz AS study_language,
      --
      s.sum_points AS exam_score,
      --
      i.edunamekz AS edu_name,
      ck2.namekz AS edu_place_name,
      s.dorm_state AS dorm
    FROM students s
    LEFT JOIN student_info si ON si.studentID = s.StudentID
    LEFT JOIN sexes s1 ON s1.ID = s.SexID
    LEFT JOIN center_kato ck_bp ON ck_bp.id = s.birth_place_cato_id
    LEFT JOIN center_kato ck_lp ON ck_lp.id = s.living_place_cato_id
    LEFT JOIN center_kato ck_rp ON ck_rp.id = s.registration_place_cato_id
    LEFT JOIN center_nationalities cn ON cn.Id = s.NationID
    LEFT JOIN center_countries cc ON cc.id = s.sitizenshipID
    LEFT JOIN specializations s2 ON s2.id = s.specializationID
    LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
    LEFT JOIN degree_types dt ON dt.degreeID = sf.degreeID
    LEFT JOIN studylanguages sl ON sl.Id = s.StudyLanguageID
    LEFT JOIN institutions i ON i.id = si.institution_id
    LEFT JOIN center_kato ck2 ON ck2.code = i.regioncode
    WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },
  find_student_data_for_contract: async (student_id) => {
    const query_str = `
      SELECT
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s.iinplt AS iin,
        s.icnumber AS id_card,
        s.icdate as id_date,
        s.icdepartment AS id_dep,
        s2.specializationCode AS specialization_code,
        s2.nameru AS specialization,
        sf.courseCount AS course_count,
        sf.nameru as study_form,
        s.living_adress AS living_address,
        s.adress AS registration_address
      FROM students s
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
      WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },
  find_student_data_for_contract_kz: async (student_id) => {
    const query_str = `
      SELECT
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s.iinplt AS iin,
        s.icnumber AS id_card,
        s.icdate as id_date,
        s.icdepartment AS id_dep,    
        s2.specializationCode AS specialization_code,
        s2.namekz AS specialization,
        sf.namekz as study_form,
        sf.courseCount AS course_count,
        s.living_adress AS living_address,
        s.adress AS registration_address
      FROM students s
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
      WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },
  find_student_data_for_title: async (student_id) => {
    const query_str = `
    SELECT
    s.lastname AS lastname,
    s.firstname AS firstname,
    s.patronymic AS patronymic,
    s.iinplt AS iin,
    s.icnumber AS id_card,
    s2.specializationCode AS specialization_code,
    s2.nameru AS specialization,
    s.phone AS phone,
    sf.id as studyformID,
    s.living_adress AS living_address,
    s.grant_type AS grant_type,
    s.adress AS registration_address
  FROM students s
  LEFT JOIN specializations s2 ON s2.id = s.specializationID
  LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
  WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },
  find_student_data_for_title_kz: async (student_id) => {
    const query_str = `
    SELECT
    s.lastname AS lastname,
    s.firstname AS firstname,
    s.patronymic AS patronymic,
    s.iinplt AS iin,
    s.icnumber AS id_card,
    s2.specializationCode AS specialization_code,
    s2.namekz AS specialization,
    s.phone AS phone,
    sf.id as studyformid,
    s.living_adress AS living_address,
    s.grant_type AS grant_type,
    s.adress AS registration_address
  FROM students s
  LEFT JOIN specializations s2 ON s2.id = s.specializationID
  LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
  WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },
  find_student_data_for_inventory: async (student_id) => {
    const query_str = `
      SELECT
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s.iinplt AS iin,
        s.seriyaAttestata AS certificate_serial,
        s.nomerAttestata AS certificate_number,
        s.dataVydachiAttestata AS certificate_date,
        s.certificate AS exam_cert,
        si.ent_cert_date_print AS exam_cert_date
      FROM students s
      LEFT JOIN student_info si ON si.studentID = s.StudentID
      WHERE s.StudentID = ${student_id};
    `;

    const [ res ] = await query_f(query_str);
    return res[0];
  },

  get_student_data_by_id_arr: async (str_arr) => {
    const query_str = `
      SELECT 
        s.StudentID AS plt_id,
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s2.nameru AS specialization,
        sf.NameRu AS study_form,
        dt.nameru AS degree_type,
        sl.NameRU AS study_language
      FROM students s
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
      LEFT JOIN degree_types dt ON dt.degreeID = sf.degreeID
      LEFT JOIN studylanguages sl ON sl.Id = s.StudyLanguageID
      WHERE s.StudentID IN (${str_arr});
    `;

    const [ res ] = await query_f(query_str);
    return res;
  },

  get_relevant_specializations: async (str_arr, con)=> {
    const query_str = `
      SELECT DISTINCT 
        s2.nameru AS specialization
      FROM students s
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      WHERE s.StudentID IN (${str_arr});
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_relevant_studyforms: async (str_arr, con) =>{
    const query_str = `
    SELECT DISTINCT
      sf.NameRu AS study_form
    From students s
    LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
    WHERE s.StudentID IN (${str_arr});
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_count: async (str_arr, specialization, study_form) => {
    const query_str = `
    SELECT count(*) as counter
    From students s
    LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
    LEFT JOIN specializations s2 ON s2.id = s.specializationID
    WHERE s.StudentID IN (${str_arr}) and s2.nameru='${specialization}' and sf.nameru='${study_form}';
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  find_student_iin_by_fio: async (lastname,firstname,patronymic) => {
    let query_str;
    query_str = `select iinplt as iin from students s
    WHERE s.lastname='${lastname}' and s.firstname='${firstname}' and s.patronymic='${patronymic}';`
    if(patronymic==''||patronymic==undefined) query_str = `select iinplt as iin from students s
    WHERE s.lastname='${lastname}' and s.firstname='${firstname}';`
    const [ res ] = await query_f(query_str);  
    return res.length !== 0 ? res[0].iin : undefined;
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
  get_tutor_academic_degree_by_iin: async (iin) => {
    const query_str = `SELECT AcademicStatusID FROM tutors t 
    WHERE t.deleted = 0 and t.iinplt=${iin};`
    const [ res ] = await query_f(query_str);  
    return res.length !== 0 ? res[0] : undefined;
  },
  find_student_by_iin: async (inn) => {
    const query_str = `SELECT StudentID AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM students WHERE iinplt = '${inn}' AND isStudent = 1;`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  find_applicant_by_iin: async (inn) => {
    const query_str = `SELECT StudentID AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM students WHERE iinplt = '${inn}' AND isStudent = 2;`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  find_tutor_by_iin: async (inn) => {
    const query_str = `SELECT tutorid AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM tutors WHERE iinplt = '${inn}' AND has_access = 1;`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_h_index: async(inn) =>{
    const query_str = `select hi.h_index_scopus as hscopus, hi.h_index_wos as hwos from hirsch_index hi
    join tutors t on t.TutorID = hi.tutorID
    where t.iinplt=${inn}`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_pub_count_by_iin_and_edition_index: async (inn,edition_index_db) =>{
    const max_year_gap = 5;
    const max_year_gap_base = 1;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str='';
    if(edition_index_db=='monograph'){
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pt.nameru='Научные монографии'
      and tp.edition_year>=${current_year-max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn}
      and pt.nameru='Научные монографии'
      and tp.edition_year>=${current_year-max_year_gap}) as tem;`;
    }
    if(edition_index_db=='international'){
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pt.nameru = 'Научные статьи'
      and pl.nameru = 'Международного уровня'
      and tp.edition_year>=${current_year-max_year_gap_base}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn}
      and pt.nameru = 'Научные статьи'
      and pl.nameru = 'Международного уровня'
      and tp.edition_year>=${current_year-max_year_gap_base}) as tem;`;
    }
    if(edition_index_db=='Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)'){
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pl.nameru='Республиканского уровня'
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year-max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pl.nameru='Республиканского уровня'
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year-max_year_gap}) as tem;`;
    }
    if(edition_index_db=='Scopus' || edition_index_db=='Web of Science'){
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn}  
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year-max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year-max_year_gap}) as tem;`;
    }
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_nirs_count_by_iin: async (inn) =>{
    const max_year_gap_nir = 3;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = `
    SELECT lastname FROM tutors t
    WHERE t.iinplt = ${inn};
    `;
    let [res_lastname] = await query_f(query_str);
    query_str = `SELECT COUNT(*) as 'total' FROM nirs n
    join tutors t on n.personID=t.TutorID
    WHERE t.iinplt=${inn}
    and n.manager not like '%${res_lastname[0].lastname}%'
    and n.startdate>='${current_year-max_year_gap_nir}-01-01';`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  }, 
  get_nirs_count_manager_by_iin: async (inn) =>{
    const max_year_gap_nir = 3;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = `
    SELECT lastname FROM tutors t
    WHERE t.iinplt = ${inn};
    `;
    let [res_lastname] = await query_f(query_str);
    query_str = `SELECT COUNT(*) as 'total' FROM nirs n
    join tutors t on n.personID=t.TutorID
    WHERE t.iinplt=${inn}
    and n.manager like '%${res_lastname[0].lastname}%'
    and n.startdate>='${current_year-max_year_gap_nir}-01-01';`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_tia_count_by_iin: async (inn) =>{
    let query_str = `
    SELECT COUNT(*) as 'total' FROM tutor_inventive_activity tia
    join tutors t on tia.tutorid = t.tutorid
    WHERE t.iinplt = ${inn};
    `;
    let [res_inv] = await query_f(query_str);
    return res_inv.length !== 0 ? res_inv[0] : 0;
  },
  get_kpi_score_by_iin_base: async(inn) =>{
    const max_year_gap_KKSON = 5;
    const max_year_gap_EsU = 1;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = `SELECT tutorid as tutor_id from tutors where iinplt='${inn}' AND has_access=1;`;
    let [res] = await query_f(query_str);
    let tutor_id = res.length !== 0 ? res[0].tutor_id : undefined;
    const query_str_kkson = `
    SELECT tp.pubID, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor', tp.edition_index_db FROM tutorpubs tp 
    JOIN tutors t ON t.TutorID = tp.TutorID
    JOIN publication_type pt ON tp.publication_type = pt.id
    JOIN publication_level pl ON tp.publication_level = pl.id
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>=(${current_year-max_year_gap_KKSON})
    and pl.nameru = 'Республиканского уровня'
    and tp.edition_index_db = 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)';
    `;
    const query_str_esu = `
    SELECT tp.pubID, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor', tp.edition_index_db FROM tutorpubs tp 
    JOIN tutors t ON t.TutorID = tp.TutorID
    JOIN publication_type pt ON tp.publication_type = pt.id
    JOIN publication_level pl ON tp.publication_level = pl.id
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>=(${current_year-max_year_gap_EsU})
    and pt.nameru = 'Научные статьи'
    and pl.nameru = 'Международного уровня';
    `;
    let [res_pub_kkson] = await query_f(query_str_kkson);
    let [res_pub_esu] = await query_f(query_str_esu);
    let KPICounter = 0;
    if (res_pub_kkson.length > 0) {
      for (let i = 0; i < res_pub_kkson.length; i++) {
        KPICounter += 7;
        // get number from db
        //console.log(`republican publication (KKSON), +7`,KPICounter);
      }             
    }
    if (res_pub_esu.length > 0) {
      for (let i = 0; i < res_pub_esu.length; i++) {
        KPICounter += 3;
        //console.log(`international publication, +3`,KPICounter);
      }             
    }
    return KPICounter;
  },
  get_kpi_score_by_iin_advanced: async (inn) =>{
    const max_year_gap_pub = 5;
    const max_year_gap_nir = 3;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = `SELECT tutorid as tutor_id from tutors where iinplt='${inn}' AND has_access=1;`;
    let [res] = await query_f(query_str);
    let tutor_id = res.length !== 0 ? res[0].tutor_id : undefined;
    query_str = `
    SELECT tp.pubID, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor', tp.edition_index_db FROM tutorpubs tp 
    JOIN tutors t ON t.TutorID = tp.TutorID
    JOIN publication_type pt ON tp.publication_type = pt.id
    JOIN publication_level pl ON tp.publication_level = pl.id
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>=(${current_year-max_year_gap_pub});
    `;
    let [res_pub] = await query_f(query_str);
    let KPICounter = 0;
    if (res_pub.length > 0) {
      for (let i = 0; i < res_pub.length; i++) {
        if (res_pub[i].pubtype == "Научные статьи") {
          if (res_pub[i].edition_index_db == "Scopus" || res_pub[i].edition_index_db == "Web of Science") {
              KPICounter += 10;
              //console.log('scopus counted, +10', KPICounter);
          }
        }
        if (res_pub[i].pubtype == "Научные монографии") {
          KPICounter += 10;
          //console.log('monograph was counted, +10', KPICounter);
          if (res_pub[i].edition_index_db == "Scopus" || res_pub[i].edition_index_db == "Web of Science") {
            KPICounter += 10;
            //console.log('..it was also a scopus/wos, +10',KPICounter);
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
      //console.log(`tia counted, +${parseInt(res_inv[0]["total"])*5}`,KPICounter);
    }
    query_str = `
    SELECT lastname FROM tutors t
    WHERE t.iinplt = ${inn};
    `;
    let [res_lastname] = await query_f(query_str);
    query_str = `
    SELECT COUNT(*) as 'total' FROM nirs n
      WHERE n.personid = ${tutor_id}
      and n.manager like '%${res_lastname.lastname}%'
      and n.startdate>='${current_year-max_year_gap_nir}-01-01';
    `;
    let [res_nirs] = await query_f(query_str);
    if(res_nirs.length>0){
      KPICounter =KPICounter + parseInt(res_nirs[0]["total"])*40;
      //console.log(`nirs manager counted, +${parseInt(res_nirs[0]["total"])*40}`,KPICounter);
    }
    query_str = `
    SELECT COUNT(*) as 'total' FROM nirs n
      WHERE n.personid = ${tutor_id}
      and n.manager not like '%${res_lastname.lastname}%'
      and n.startdate>'${current_year-max_year_gap_nir}-01-01';
    `;
    [res_nirs] = await query_f(query_str);
    if(res_nirs.length>0){
      KPICounter =KPICounter + parseInt(res_nirs[0]["total"])*20;
      //console.log(`nirs NOT manager counted, +${parseInt(res_nirs[0]["total"])*20}`,KPICounter);
    }
    return KPICounter;
  }

};

module.exports = db;