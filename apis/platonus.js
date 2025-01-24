'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");

const connection_config = {
  host: process.env.PLT_DATABASE_HOST,
  port: process.env.PLT_DATABASE_PORT,
  user: process.env.PLT_DATABASE_USER,
  password: process.env.PLT_DATABASE_PASSWORD,
  database: process.env.PLT_DATABASE_NAME,
  connectionLimit: 20,
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

const last_insert_id_f = async (con) => { const [[{ id }]] = await con.query("SELECT LAST_INSERT_ID() AS id"); return id; }
const row_count_f = async (con) => { const [[{ count }]] = await con.query("SELECT ROW_COUNT() AS count"); return count; }

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

    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_student_count_by_specialization: async(specialization_name) =>{
    const query_str = `select count(studentid) as count from students s
    join specializations sp on sp.id = s.specializationID
    where sp.nameru='${specialization_name}' and isStudent=1;`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0].count : undefined;
  },
  get_student_data_by_qr: async (student_id) => {
    const query_str = `
    SELECT 
    s.StudentID AS plt_id,
    s.lastname AS lastname,
    s.firstname AS firstname,
    s.patronymic AS patronymic,
    s2.nameru AS specialization,
    g.name as groupname,
    sf.NameRu AS study_form,
    dt.nameru AS degree_type,
    sl.NameRU AS study_language
  FROM students s
  LEFT JOIN specializations s2 ON s2.id = s.specializationID
  LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
  LEFT JOIN \`groups\` g ON s.groupID = g.groupID
  LEFT JOIN degree_types dt ON dt.degreeID = sf.degreeID
  LEFT JOIN studylanguages sl ON sl.Id = s.StudyLanguageID
  WHERE s.StudentID = ${student_id};
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_employees_for_hr: async () => {
    const query_str = `Select t.iinplt as iin,
    t.lastname, t.firstname, t.patronymic, 
    t.icnumber,
    t.adress as registration_adress,
    t.living_adress,
    t.mobilePhone as phone,
    if (t.cafedraID is null or t.CafedraID = 0, ss.nameru, c.cafedraNameRU ) as dep,
    if (t.cafedraID is null or t.CafedraID = 0, null, ast.nameru ) as academic,
    t.RATE,
    ws.NameRU as workstatus
    from tutors t 
    left JOIN structural_subdivision ss on t.departmentid = ss.id
    join academicstatus ast on t.AcademicStatusID = ast.id
    join workstatus ws on t.work_status = ws.id
    left JOIN cafedras c on c.cafedraID = t.CafedraID
    where t.deleted = 0;`;
    const [res] = await query_f(query_str);
    return res;
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

    const [res] = await query_f(query_str);
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

    const [res] = await query_f(query_str);
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

    const [res] = await query_f(query_str);
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

    const [res] = await query_f(query_str);
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
    s.mobilePhone AS phone,
    sf.id as studyformID,
    s.living_adress AS living_address,
    s.grant_type AS grant_type,
    s.adress AS registration_address
  FROM students s
  LEFT JOIN specializations s2 ON s2.id = s.specializationID
  LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
  WHERE s.StudentID = ${student_id};
    `;

    const [res] = await query_f(query_str);
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
    s.mobilePhone AS phone,
    sf.id as studyformid,
    s.living_adress AS living_address,
    s.grant_type AS grant_type,
    s.adress AS registration_address
  FROM students s
  LEFT JOIN specializations s2 ON s2.id = s.specializationID
  LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
  WHERE s.StudentID = ${student_id};
    `;

    const [res] = await query_f(query_str);
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
        si.ent_cert_date_print AS exam_cert_date,
        si.f_seriya_diplom AS alternative_certificate_serial,
        si.f_nomer_diplom AS alternative_certificate_number,
        si.f_data_vydachi_diploma AS alternative_certificate_date
      FROM students s
      LEFT JOIN student_info si ON si.studentID = s.StudentID
      WHERE s.StudentID = ${student_id};
    `;

    const [res] = await query_f(query_str);
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

    const [res] = await query_f(query_str);
    return res;
  },
  get_student_data_by_iin_arr: async (str_arr) => {
    const query_str = `
      SELECT 
        s.StudentID AS plt_id,
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s.grant_type AS grant_type,
        COALESCE(b.nameru, 'Без квоты') as benefits,
        s2.nameru AS specialization,
        sf.NameRu AS study_form,
        s.mobilePhone as phone,
        s.iinplt as iin
      FROM students s
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
      LEFT JOIN student_info si on s.studentid = si.studentid
      LEFT JOIN benefits b on b.id = si.benefit_quota_id
      WHERE s.iinplt IN (${str_arr}) and s.isstudent in (1,2);
    `;

    const [res] = await query_f(query_str);
    return res;
  },
  generate_dashboard_data_tutor: async () => {
    const query_str = `
    select concat(t.lastname,' ',t.firstname,' ',t.patronymic) as 'fio',
      s.NAMERU as 'gender',
      sd.NAMERU as 'scientificdegree',
      ast.nameru as 'academicstatus',
      c.cafedraNameRU as 'cafedra',
      f.facultyNameRU as 'faculty',
      CASE 
          WHEN tc.type = 0 THEN 'Штатный'
          WHEN tc.type = 1 THEN 'Внутренний совместитель'
          WHEN tc.type = 2 THEN 'Внешний совместитель'
          ELSE '-'
      END AS 'workstatus',
      cc.nameru as 'citizenship',
      t.maternity_leave
    from tutors t
    left join scientificdegree sd on t.ScientificDegreeID = sd.id
    left join academicstatus ast on t.AcademicStatusID = ast.id
    left join sexes s on t.SexID = s.ID
    left join cafedras c on t.CafedraID = c.cafedraID
    left join faculties f on f.FacultyID = c.FacultyID
    left join center_countries cc on t.citizenshipID = cc.id
    left join tutor_cafedra tc on tc.tutorID = t.TutorID
    where t.deleted = 0
    and t.CafedraID != 0
    and tc.type is not null;
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  generate_dashboard_data_student: async () => {
    const query_str = `select concat(s.lastname,' ',s.firstname,' ',s.patronymic) as 'fio',
      sx.NAMERU as 'gender',
      s.CourseNumber,
      s.GPA,
      sf.nameru as 'studyform',
      dt.nameru as 'degreetype',
      sl.NameRU as 'studylanguage',
      CASE 
        WHEN s.grant_type = -4 THEN 'Грант'
        WHEN s.grant_type = -7 THEN 'Платное'
        WHEN s.grant_type = 0 THEN 'В рамках обмена'
        ELSE ''
      END as 'granttype',
      COALESCE(b.nameru, 'Без квоты') as benefits,
      sp.nameru as 'specialization',
      cf.cafedraNameRU as 'cafedra',
      f.facultyNameRU as 'faculty',
      cc.nameru as 'citizenship',
      ck.nameru as 'registration'
    from students s
    left join sexes sx on s.SexID = sx.ID
    left join studyforms sf on sf.id = s.studyformID
    left join degree_types dt on sf.degreeID=dt.degreeid
    left join studylanguages sl on sl.Id = s.StudyLanguageID
    LEFT JOIN student_info si on s.studentid = si.studentid
    LEFT JOIN benefits b on b.id = si.benefit_quota_id
    left join specializations sp on sp.id = s.specializationID
    JOIN profession_cafedra pc ON sp.prof_caf_id = pc.id
    JOIN cafedras cf ON pc.cafedraID = cf.cafedraID
    left join faculties f on cf.FacultyID = f.FacultyID
    left join center_countries cc on s.sitizenshipID = cc.id
    left join center_kato ck on ck.id = s.registration_place_cato_id
    where s.isstudent = 1;
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_relevant_specializations: async (str_arr) => {
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
  get_student_data_for_library: async (iin) => {
    const query_str = `
    SELECT 
        s.StudentID AS plt_id,
        s.lastname AS lastname,
        s.firstname AS firstname,
        s.patronymic AS patronymic,
        s2.nameru AS specialization,
        sf.NameRu AS extradata,
        g.name AS extradata2,
        s.mobilePhone as phone,
        s.iinplt as iin,
        s.isstudent as status
      FROM students s
      LEFT JOIN \`groups\` g on s.groupID=g.groupid 
      LEFT JOIN specializations s2 ON s2.id = s.specializationID
      LEFT JOIN studyforms sf ON sf.Id = s.StudyFormID
      LEFT JOIN student_info si on s.studentid = si.studentid
      WHERE s.iinplt = '${iin}' and s.isstudent in (1,3) order by s.StudentID desc limit 1;
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutor_data_for_library: async (iin) => {
    const query_str = `
    SELECT 
        t.tutorid AS plt_id,
        t.lastname AS lastname,
        t.firstname AS firstname,
        t.patronymic AS patronymic,
        c.cafedraNameRU AS specialization,
        f.facultyNameRU AS extradata2,
        t.mobilePhone as phone,
        t.iinplt as iin,
        t.deleted as status
      FROM tutors t
      LEFT JOIN tutor_cafedra tc ON t.TutorID = tc.tutorID
      LEFT JOIN cafedras c ON tc.cafedraid = c.cafedraID
      LEFT JOIN faculties f on c.FacultyID = f.FacultyID
      WHERE t.iinplt = '${iin}' order by t.TutorID desc limit 1;
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_employee_data_for_library: async (iin) => {
    const query_str = `
    SELECT 
        t.tutorid AS plt_id,
        t.lastname AS lastname,
        t.firstname AS firstname,
        t.patronymic AS patronymic,
        t.mobilePhone as phone,
        t.iinplt as iin,
        t.deleted as status
      FROM tutors t
      WHERE t.iinplt = '${iin}' order by t.TutorID desc limit 1;
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_relevant_studyforms: async (str_arr, con) => {
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
  find_student_iin_by_fio: async (lastname, firstname, patronymic) => {
    let query_str;
    query_str = `select iinplt as iin from students s
    WHERE s.lastname='${lastname}' and s.firstname='${firstname}' and s.patronymic='${patronymic}';`
    if (patronymic == '' || patronymic == undefined) query_str = `select iinplt as iin from students s
    WHERE s.lastname='${lastname}' and s.firstname='${firstname}';`
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0].iin : undefined;
  },

  get_tutor_cafedra_by_iin: async (iin) => {
    const query_str = `SELECT c.cafedraid, c.cafedraNameRU
    FROM tutors t 
    JOIN tutor_cafedra tc ON t.TutorID = tc.tutorID
    JOIN cafedras c ON tc.cafedraid = c.cafedraID
    WHERE t.deleted = 0 and t.iinplt=${iin};`
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_tutor_cafedra_by_tutorid: async (tutorid) => {
    const query_str = `SELECT c.cafedraid, c.cafedraNameRU as cafedra
    FROM tutors t 
    JOIN tutor_cafedra tc ON t.TutorID = tc.tutorID
    JOIN cafedras c ON tc.cafedraid = c.cafedraID
    WHERE t.tutorid=${tutorid};`
    const [res] = await query_f(query_str);
    const cafedra_default = {cafedraid: 0, cafedra: 'empty'}
    return res.length !== 0 ? res[0] : cafedra_default;
  },
  get_tutor_academic_degree_by_iin: async (iin) => {
    const query_str = `SELECT AcademicStatusID FROM tutors t 
    WHERE t.deleted = 0 and t.iinplt=${iin};`
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_tutorpubs: async (iin) => {
    console.log(`debugging for iin ${iin}`);
    const current_year = new Date().getFullYear();
    const year_frame = 3;
    let query_str = `select * from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db, tp.refDBID from internal_pubcoauthorships ip
    join tutors t on t.tutorid=ip.tutorID
    join tutorpubs tp on ip.pubID = tp.pubID
    join publication_type pt ON tp.publication_type = pt.id
    join publication_level pl ON tp.publication_level = pl.id
    where t.iinplt = '${iin}' and t.deleted = 0
    and tp.edition_year>=${current_year - year_frame}
    UNION ALL
    select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db, tp.refDBID from tutorpubs tp
    join tutors t on t.tutorid=tp.tutorID
    join publication_type pt ON tp.publication_type = pt.id
    join publication_level pl ON tp.publication_level = pl.id
    where t.iinplt = '${iin}' and t.deleted = 0
    and tp.edition_year>=${current_year - year_frame}) as tem;`
    const [publications] = await query_f(query_str);
    console.log(`found ${publications.length} publications`);
    if (publications.length == 0) return 0;
    query_str = `SELECT AcademicStatusID FROM tutors t 
    WHERE t.deleted = 0 and t.iinplt = '${iin}';`
    const [academicstatus] = await query_f(query_str);
    console.log(`academicstatus is ${academicstatus[0].AcademicStatusID}`);
    if (academicstatus) {
      switch (academicstatus[0].AcademicStatusID) {
        case 0: case 1: {
          let counter = 0;
          // 'Без звания'; 
          if (publications.length >= 5){
            console.log(`5 or more publications`);
            for (const pub of publications){
              if(pub.refDBID == 1 || pub.refDBID == 2 || pub.refDBID == 3 ||
                pub.edition_index_db == 'Scopus' || 
              pub.edition_index_db == 'Web of Science' ||
              pub.edition_index_db == 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)' ||
              pub.edition_index_db == 'Комитет по обеспечению качества в сфере науки и высшего образования Министерства науки и высшего образования Республики Казахстан (КОКСНВО МНВО РК)'
              ) {
                counter++;
                console.log(`found suited pub, adding up to ${counter}`);
                if (counter == 2 && publications.length >= 10) return 2;
              }
            }
            if (counter > 0) return 1
            else return 0;
          }
          else {
            console.log(`${publications.length} wasn't enough`);
            return 0
          };
        }
        break;
        case 2: case 4: {
          // 'Доцент'; 
          let counter = 0;
          if (publications.length >= 5){
            for (const pub of publications){
              if(pub.refDBID == 1 || pub.refDBID == 2 || pub.refDBID == 3 || pub.edition_index_db == 'Scopus' || pub.edition_index_db == 'Web of Science' || pub.edition_index_db == 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)' ||
              pub.edition_index_db == 'Комитет по обеспечению качества в сфере науки и высшего образования Министерства науки и высшего образования Республики Казахстан (КОКСНВО МНВО РК)') {
                counter++;
                console.log(`found suited pub, adding up to ${counter}`);
                if (counter == 6 && publications.length >= 10) return 2;
              }
            }
            if (counter >= 3){ 
              return 1;
            }
            else {
              console.log(`${counter} wasn't enough`);
              return 0;
            }
          }
          else {
            console.log(`${publications.length} wasn't enough`);
            return 0
          };     
        }
        break;
        case 3: {
          // 'Профессор'; 
          let counter = 0;
          if (publications.length >= 7){
            for (const pub of publications){
              if(pub.refDBID == 1 || pub.refDBID == 2 || pub.refDBID == 3 || pub.edition_index_db == 'Scopus' || pub.edition_index_db == 'Web of Science' || pub.edition_index_db == 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)' ||
              pub.edition_index_db == 'Комитет по обеспечению качества в сфере науки и высшего образования Министерства науки и высшего образования Республики Казахстан (КОКСНВО МНВО РК)') {
                counter++;
                console.log(`found suited pub, adding up to ${counter}`);
                if (counter == 10 && publications.length >= 14) return 2;
              }
            }
            for (const pub of publications){
              if(pub.pubtype == 'Научные монографии') {
                counter++;
                console.log(`found suited monograph, adding up to ${counter}`);
                if (counter == 10 && publications.length >= 14) return 2;
              }
            }
            if (counter >= 5){ 
              return 1;
            }
            else {
              console.log(`${counter} wasn't enough`);
              return 0;
            }
          }
          else {
            console.log(`${publications.length} wasn't enough`);
            return 0
          };
          
        } 
        break;
        default: {
          return 0;
        }
      }
    }
  },
  get_tutorliterature: async (iin) => {
    console.log(`debugging for iin ${iin}`);
    const current_year = new Date().getFullYear();
    const year_frame = 5;
    let query_str = `select count(*) as count from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db, tp.refDBID from internal_pubcoauthorships ip
    join tutors t on t.tutorid=ip.tutorID
    join tutorpubs tp on ip.pubID = tp.pubID
    join publication_type pt ON tp.publication_type = pt.id
    join publication_level pl ON tp.publication_level = pl.id
    where t.iinplt = '${iin}' and t.deleted = 0
    and tp.publication_type = 5
    and tp.edition_year>=${current_year - year_frame}
    UNION ALL
    select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db, tp.refDBID from tutorpubs tp
    join tutors t on t.tutorid=tp.tutorID
    join publication_type pt ON tp.publication_type = pt.id
    join publication_level pl ON tp.publication_level = pl.id
    where t.iinplt = '${iin}' and t.deleted = 0
    and tp.publication_type = 5
    and tp.edition_year>=${current_year - year_frame}) as tem;`
    const [publications] = await query_f(query_str);
    if (publications.length == 0 || publications[0].count == 0) return 0;
    console.log(`count is ${publications[0].count}`);
    query_str = `SELECT AcademicStatusID FROM tutors t 
    WHERE t.deleted = 0 and t.iinplt = '${iin}';`
    const [academicstatus] = await query_f(query_str);
    console.log(`academicstatus is ${academicstatus[0].AcademicStatusID}`);
    if (academicstatus) {
      switch (academicstatus[0].AcademicStatusID) {
        case 0: case 1: {
          // 'Без звания'; 
          if(publications[0].count >= 2) return 2
          else if (publications[0].count == 1) return 1
          else return 0;
        }
        break;
        case 2: {
          // 'Доцент'; 
          if(publications[0].count >= 2) return 2
          else if (publications[0].count == 1) return 1
          else return 0;
        }
        break;
        case 3: {
          // 'Профессор'; 
          if(publications[0].count >= 2) return 2
          else if (publications[0].count == 1) return 1
          else return 0;
        } 
        break;
        case 4: {
          // 'Ассоциированный профессор (доцент)'; 
          if(publications[0].count >= 2) return 2
          else if (publications[0].count == 1) return 1
          else return 0;
        }
        break;
        default: {
          return 0;
        }
      }
    }
  }, 
  find_student_by_iin: async (inn) => {
    const query_str = `SELECT StudentID AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM students WHERE iinplt = '${inn}' AND isStudent = 1;`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  find_applicant_by_iin: async (inn) => {
    const query_str = `SELECT StudentID AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM students WHERE iinplt = '${inn}' AND isStudent = 2;`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_debt_data_by_iin: async (iin) => {
    const query_str = `SELECT iin, otherBalance as 'debt' from student_payments where iin=${iin};`;
    const [res] = await query_f(query_str);
    if (res[0].debt==null) return [];
    return res.length>0 ? [Object.assign(res[0],{overall:'undefined'})] : [];
  },
  form_admission_stats: async () => {
    const d = new Date();
    let current_year = d.getFullYear();
    const query_str = `SELECT 
    sf.nameru AS StudyFormName, 
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-06-07 23:59:59' THEN 1 ELSE 0 END) AS 'june7',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-06-14 23:59:59' THEN 1 ELSE 0 END) AS 'june14',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-06-21 23:59:59' THEN 1 ELSE 0 END) AS 'june21',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-06-28 23:59:59' THEN 1 ELSE 0 END) AS 'june28',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-07-05 23:59:59' THEN 1 ELSE 0 END) AS 'july5',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-07-12 23:59:59' THEN 1 ELSE 0 END) AS 'july12',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-07-19 23:59:59' THEN 1 ELSE 0 END) AS 'july19',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-07-26 23:59:59' THEN 1 ELSE 0 END) AS 'july26',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-08-02 23:59:59' THEN 1 ELSE 0 END) AS 'august2',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-08-09 23:59:59' THEN 1 ELSE 0 END) AS 'august9',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-08-16 23:59:59' THEN 1 ELSE 0 END) AS 'august16',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-08-23 23:59:59' THEN 1 ELSE 0 END) AS 'august23',
    SUM(CASE WHEN s.StartDate BETWEEN '${current_year}-03-14 23:59:59' AND '${current_year}-08-30 23:59:59' THEN 1 ELSE 0 END) AS 'august30'
FROM 
    students s
JOIN 
    studyforms sf ON s.StudyFormID = sf.id
join
    specializations sp on s.specializationID = sp.id
join 
    studylanguages sl on s.studylanguageID = sl.id
WHERE
    s.StudyFormID in (1,3,4,5,8,15,17,21,23,24,29,30,31) and
    s.studylanguageID != 0 and 
    isStudent = 2
GROUP BY 
    s.StudyFormID, sf.nameru;`;
    const [res] = await query_f(query_str);
    return res;
  },
  form_admission_stats_main: async () => {
    const d = new Date();
    let current_year = d.getFullYear();
    const query_str = `SELECT 
    sp.nameru AS specialization,
    
SUM(CASE WHEN sf.id = 1  AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf1_sl1,
SUM(CASE WHEN sf.id = 1  AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf1_sl2,

SUM(CASE WHEN sf.id = 3  AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf3_sl1,
SUM(CASE WHEN sf.id = 3  AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf3_sl2,

SUM(CASE WHEN sf.id = 4  AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf4_sl1,
SUM(CASE WHEN sf.id = 4  AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf4_sl2,

SUM(CASE WHEN sf.id = 5  AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf5_sl1,
SUM(CASE WHEN sf.id = 5  AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf5_sl2,

SUM(CASE WHEN sf.id = 8  AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf8_sl1,
SUM(CASE WHEN sf.id = 8  AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf8_sl2,
 
SUM(CASE WHEN sf.id = 15 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf15_sl1,
SUM(CASE WHEN sf.id = 15 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf15_sl2,
 
SUM(CASE WHEN sf.id = 17 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf17_sl1,
SUM(CASE WHEN sf.id = 17 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf17_sl2,
 
SUM(CASE WHEN sf.id = 21 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf21_sl1,
SUM(CASE WHEN sf.id = 21 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf21_sl2,
 
SUM(CASE WHEN sf.id = 23 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf23_sl1,
SUM(CASE WHEN sf.id = 23 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf23_sl2,
 
SUM(CASE WHEN sf.id = 24 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf24_sl1,
SUM(CASE WHEN sf.id = 24 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf24_sl2,
 
SUM(CASE WHEN sf.id = 29 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf29_sl1,
SUM(CASE WHEN sf.id = 29 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf29_sl2,
 
SUM(CASE WHEN sf.id = 30 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf30_sl1,
SUM(CASE WHEN sf.id = 30 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf30_sl2,
 
SUM(CASE WHEN sf.id = 31 AND sl.id = 1 THEN 1 ELSE 0 END) AS  sf31_sl1,
SUM(CASE WHEN sf.id = 31 AND sl.id = 2 THEN 1 ELSE 0 END) AS  sf31_sl2

FROM 
    students s
JOIN 
    specializations sp ON s.specializationID = sp.id
JOIN 
    studyforms sf ON s.studyformID = sf.id
JOIN 
    studylanguages sl ON s.studylanguageID = sl.id
where s.isStudent=2 and startdate>='${current_year}-03-15 00:00:00'
GROUP BY 
    sp.nameru
ORDER BY 
    sp.nameru;`;
    const [res] = await query_f(query_str);
    return res;
  },
  find_tutor_by_iin: async (inn) => {
    const query_str = `SELECT tutorid AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM tutors WHERE iinplt = '${inn}' AND has_access = 1 AND cafedraid != 0;`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  find_employee_by_iin: async (inn) => {
    const query_str = `SELECT tutorid AS plt_id, firstname AS name, lastname, patronymic AS middlename FROM tutors WHERE iinplt = '${inn}' AND has_access = 1 AND (cafedraid = 0 OR cafedraid IS NULL);`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_h_index: async (inn) => {
    const query_str = `select hi.h_index_scopus as hscopus, hi.h_index_wos as hwos from hirsch_index hi
    join tutors t on t.TutorID = hi.tutorID
    where t.iinplt=${inn}`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_pub_count_by_iin_and_edition_index: async (inn, edition_index_db) => {
    const max_year_gap = 5;
    const max_year_gap_base = 1;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = '';
    if (edition_index_db == 'monograph') {
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pt.nameru='Научные монографии'
      and tp.edition_year>=${current_year - max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn}
      and pt.nameru='Научные монографии'
      and tp.edition_year>=${current_year - max_year_gap}) as tem;`;
    }
    if (edition_index_db == 'international') {
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pt.nameru = 'Научные статьи'
      and pl.nameru = 'Международного уровня'
      and tp.edition_year>=${current_year - max_year_gap_base}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn}
      and pt.nameru = 'Научные статьи'
      and pl.nameru = 'Международного уровня'
      and tp.edition_year>=${current_year - max_year_gap_base}) as tem;`;
    }
    if (edition_index_db == 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)') {
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pl.nameru='Республиканского уровня'
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year - max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pl.nameru='Республиканского уровня'
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year - max_year_gap}) as tem;`;
    }
    if (edition_index_db == 'Комитет по обеспечению качества в сфере науки и высшего образования Министерства науки и высшего образования Республики Казахстан (КОКСНВО МНВО РК)') {
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pl.nameru='Республиканского уровня'
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year - max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and pl.nameru='Республиканского уровня'
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year - max_year_gap}) as tem;`;
    }
    if (edition_index_db == 'Scopus' || edition_index_db == 'Web of Science') {
      query_str = `select count(*) as 'pubcount' from (select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from internal_pubcoauthorships ip
      join tutors t on t.tutorid=ip.tutorID
      join tutorpubs tp on ip.pubID = tp.pubID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn}  
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year - max_year_gap}
      UNION ALL
      select tp.pubID, tp.theme, tp.edition_year, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor',tp.edition_index_db from tutorpubs tp
      join tutors t on t.tutorid=tp.tutorID
      join publication_type pt ON tp.publication_type = pt.id
      join publication_level pl ON tp.publication_level = pl.id
      where t.iinplt = ${inn} 
      and tp.edition_index_db='${edition_index_db}'
      and tp.edition_year>=${current_year - max_year_gap}) as tem;`;
    }
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_nirs_count_by_iin: async (inn) => {
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
    and n.startdate>='${current_year - max_year_gap_nir}-01-01';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_nirs_count_manager_by_iin: async (inn) => {
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
    and n.startdate>='${current_year - max_year_gap_nir}-01-01';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : 0;
  },
  get_tia_count_by_iin: async (inn) => {
    let query_str = `
    SELECT COUNT(*) as 'total' FROM tutor_inventive_activity tia
    join tutors t on tia.tutorid = t.tutorid
    WHERE t.iinplt = ${inn};
    `;
    let [res_inv] = await query_f(query_str);
    return res_inv.length !== 0 ? res_inv[0] : 0;
  },
  get_kpi_score_by_iin_base: async (inn) => {
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
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>=(${current_year - max_year_gap_KKSON})
    and pl.nameru = 'Республиканского уровня'
    and tp.edition_index_db = 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)';
    `;
    const query_str_esu = `
    SELECT tp.pubID, t.lastname,  t.firstname, pt.nameru AS 'pubtype', pl.nameru as 'publevel', tp.impact_factor as 'impact_factor', tp.edition_index_db FROM tutorpubs tp 
    JOIN tutors t ON t.TutorID = tp.TutorID
    JOIN publication_type pt ON tp.publication_type = pt.id
    JOIN publication_level pl ON tp.publication_level = pl.id
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>=(${current_year - max_year_gap_EsU})
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
  get_kpi_score_by_iin_advanced: async (inn) => {
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
    WHERE tp.tutorid = ${tutor_id} and tp.edition_year>=(${current_year - max_year_gap_pub});
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
    if (res_inv.length > 0) {
      KPICounter = KPICounter + parseInt(res_inv[0]["total"]) * 5;
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
      and n.startdate>='${current_year - max_year_gap_nir}-01-01';
    `;
    let [res_nirs] = await query_f(query_str);
    if (res_nirs.length > 0) {
      KPICounter = KPICounter + parseInt(res_nirs[0]["total"]) * 40;
      //console.log(`nirs manager counted, +${parseInt(res_nirs[0]["total"])*40}`,KPICounter);
    }
    query_str = `
    SELECT COUNT(*) as 'total' FROM nirs n
      WHERE n.personid = ${tutor_id}
      and n.manager not like '%${res_lastname.lastname}%'
      and n.startdate>'${current_year - max_year_gap_nir}-01-01';
    `;
    [res_nirs] = await query_f(query_str);
    if (res_nirs.length > 0) {
      KPICounter = KPICounter + parseInt(res_nirs[0]["total"]) * 20;
      //console.log(`nirs NOT manager counted, +${parseInt(res_nirs[0]["total"])*20}`,KPICounter);
    }
    return KPICounter;
  }

};

module.exports = db;