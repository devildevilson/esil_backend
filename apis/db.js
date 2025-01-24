'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");
const plt = require("@apis/platonus");

const connection_config = {
  host: process.env.CLOUD_DATABASE_HOST,
  port: process.env.CLOUD_DATABASE_PORT,
  user: process.env.CLOUD_DATABASE_USER,
  password: process.env.CLOUD_DATABASE_PASSWORD,
  database: process.env.CLOUD_DATABASE_NAME,
  connectionLimit: 20,
  connectTimeout: 100000,
};

// как закрыть то елы палы
const pool = mysql.createPool(connection_config);

function mysql_real_escape_string(str) {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default: return char;
    }
  });
}

function good_num(num) { return num < 10 ? "0" + num : "" + num; }

function format_date(date) {
  const yyyy = good_num(date.getFullYear());
  const mm = good_num(date.getMonth() + 1);
  const dd = good_num(date.getDate());
  const hh = good_num(date.getHours());
  const MM = good_num(date.getMinutes());
  const ss = good_num(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${MM}:${ss}`;
}

function getLastDayOfMonth(year, month) {
  const lastDay = new Date(year, month, 0);
  const yearStr = lastDay.getFullYear();
  const monthStr = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dayStr = String(lastDay.getDate()).padStart(2, '0');

  return `${yearStr}-${monthStr}-${dayStr}`;
}
//const user_roles = [ "plt_student", "plt_tutor" ];

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

  update_kpi_for_user: async (user_id) => {
    let query_str = `select iin from users
    join roles on users.id = roles.user_id
    where roles.user_id=${user_id};`;
    let [iin_res] = await query_f(query_str);
    let iin = iin_res[0].iin;
    let kpiscore_cloud_base = await db.count_kpi_score_by_iin_base(iin);
    let kpiscore_cloud_advanced = await db.count_kpi_score_by_iin_advanced(iin);
    let kpi_kkson_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)');
    let kpi_kkson2_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'Комитет по обеспечению качества в сфере науки и высшего образования Министерства науки и высшего образования Республики Казахстан (КОКСНВО МНВО РК)');
    let kpi_scopus_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'Scopus');
    let kpi_monograph_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'monograph');
    let kpi_international_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'international');
    let kpi_wos_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'Web of Science');
    let kpi_nirs_count = await plt.get_nirs_count_by_iin(iin);
    let kpi_nirs_count_manager = await plt.get_nirs_count_manager_by_iin(iin);
    let kpi_tia_count = await plt.get_tia_count_by_iin(iin);
    let h_index = await plt.get_h_index(iin);
    let hindex_scopus = 0, hindex_wos = 0;
    let kpiscore_base = kpiscore_cloud_base + kpi_kkson_count.pubcount * 7 + kpi_kkson2_count.pubcount * 7 + kpi_international_count.pubcount * 3;
    let kpiscore_advanced = kpiscore_cloud_advanced + kpi_scopus_count.pubcount * 10 + kpi_monograph_count.pubcount * 10 + kpi_wos_count.pubcount * 10 + kpi_nirs_count.total * 20 + kpi_nirs_count_manager.total * 40 + kpi_tia_count.total * 5;
    if (h_index != undefined) {
      if (h_index.hscopus != undefined) hindex_scopus = h_index.hscopus;
      if (h_index.hwos != undefined) hindex_wos = h_index.hwos;
    }
    let kpi_overall = 0;
    kpi_overall += kpiscore_base + kpiscore_advanced;
    if (hindex_scopus != 0 || hindex_wos != 0) {
      kpi_overall += 5;
      kpiscore_advanced += 5;
    }
    console.log(`combined kpiscore for ${user_id}`, kpi_overall);
    query_str = `SELECT userid from kpi_scores where userid=${user_id};`;
    let [res] = await query_f(query_str);
    let umkd_mdl_completion = await db.get_umkd_moodle_by_userid(user_id);
    const calculated_margin_mdl = Math.round(15 / 50 * umkd_mdl_completion[0].umkd_mdl_completion - 15);
    kpiscore_base += calculated_margin_mdl;
    kpi_overall += calculated_margin_mdl;
    if (res.length === 0) {
      const file_data = {
        userid: user_id,
        score: kpi_overall,
        score_base: kpiscore_base,
        score_advanced: kpiscore_advanced,
        kkson_count: kpi_kkson_count,
        scopus_count: kpi_scopus_count,
        wos_count: kpi_wos_count,
        monograph_count: kpi_monograph_count,
        international_count: kpi_international_count,
        nirs_count: kpi_nirs_count.total,
        nirs_count_manager: kpi_nirs_count_manager.total,
        tia_count: kpi_tia_count.total,
        h_index_scopus: hindex_scopus,
        h_index_wos: hindex_wos
      };
      const file = await db.create_row("kpi_scores", file_data);

    }
    else {
      query_str = `update kpi_scores set score=${kpi_overall}, score_base=${kpiscore_base}, score_advanced=${kpiscore_advanced}, kkson_count=${kpi_kkson_count.pubcount},scopus_count=${kpi_scopus_count.pubcount},wos_count=${kpi_wos_count.pubcount}, monograph_count=${kpi_monograph_count.pubcount}, international_count=${kpi_international_count.pubcount}, h_index_scopus=${hindex_scopus},h_index_wos=${hindex_wos},nirs_count=${kpi_nirs_count.total}, nirs_count_manager=${kpi_nirs_count_manager.total}, tia_count=${kpi_tia_count.total} where userid=${user_id};`;
      let [res] = await query_f(query_str);
      return res;
    }
    return res;
  },
  suspend_tutor: async (userid) => {
    const query_str = `update users set suspended = 1 where id=${userid};`;
    await query_f(query_str);
    return 1;;
  },
  find_user_by_username: async (username) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,password,suspended,alt_id FROM users WHERE username = '${mysql_real_escape_string(username)}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  find_user_by_id: async (userid) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,iin,suspended,alt_id FROM users WHERE id = '${userid}' and suspended = 0;`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  update_applicant_extrainfo: async (user_id, column, data) => {
    const query_str = `select userid from admission_extrainfo where userid=${user_id};`;
    const [res] = await query_f(query_str);
    if (res.length !== 0) {
      const update_str = `update admission_extrainfo set ${column}='${data}' where userid=${user_id};`;
      await query_f(update_str);
    }
    else {
      const insert_str = `insert into admission_extrainfo (userid,${column}) values (${user_id},'${data}');`;
      await query_f(insert_str);
    }
    return `updated ${user_id} extradata`;
  },
  get_applicant_extradata_by_userid: async (user_id) => {
    const query_str = `SELECT * from admission_extrainfo where userid = ${user_id};`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_kpiscore_by_userid: async (user_id) => {
    const query_str = `SELECT score from kpi_scores where userid = ${user_id};`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_role_by_iin: async (inn) => {
    const query_str = `SELECT role from roles join users on users.id=roles.user_id where users.iin = ${inn};`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_umkd_moodle_by_userid: async (userid) => {
    const query_str = `select umkd_mdl_completion from kpi_scores where userid=${userid};`;
    let [res] = await query_f(query_str);
    return res;
  },
  get_role_by_username: async (username) => {
    const query_str = `SELECT role from roles join users on users.id=roles.user_id where users.username = '${username}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_iin_by_username: async (username) => {
    const query_str = `SELECT iin from users where username = '${username}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0].iin : undefined;
  },
  get_user_id_by_iin: async (inn) => {
    const query_str = `SELECT id from users where iin = '${inn}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_iin_by_user_id: async (id) => {
    const query_str = `SELECT iin from users where id = '${id}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_all_dorm_requests: async (iin) => {
    const query_str = `SELECT * from dormrequests;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_dorm_request_by_iin: async (iin) => {
    const query_str = `SELECT * from dormrequests where iin = '${iin}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  delete_dorm_request_by_iin: async (iin) => {
    const query_str = `delete from dormrequests where iin = '${iin}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  approve_dorm_request_by_iin: async (iin, dormtype, message, roomnumber, datemodified) => {
    let ishostel;
    if (dormtype == 'dorm') ishostel = '0';
    if (dormtype == 'hostel') ishostel = '1';
    const query_str = `update dormrequests set approved = 1, ishostel = ${ishostel}, notification_message = '${message}', roomnumber = '${roomnumber}', datemodified = '${datemodified}' where iin = '${iin}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  deny_dorm_request_by_iin: async (iin, message, datemodified) => {
    const query_str = `update dormrequests set approved = -1, notification_message = '${message}', datemodified = '${datemodified}' where iin = '${iin}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_user_roles: async (user_id) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  check_book_transfer_eligibility: async (user_id, book_id) => {
    const query_str = `SELECT count(*) as sum from booktransfer where userid=${user_id} and bookid=${book_id} and resolved='false';`;
    const [res] = await query_f(query_str);
    return res;
  },
  check_photo_upload_eligibility: async (iin) => {
    const query_str = `SELECT count(*) as sum from photos where iin='${iin}';`;
    const [res] = await query_f(query_str);
    return res[0].sum == 0;
  },
  // roles - это массив
  get_user_roles_specific: async (user_id, roles) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id} AND role IN ('${roles.join("','")}');`;
    const [res] = await query_f(query_str);
    return res;
  },

  get_users_with_role: async (role) => {
    const query_str = `
      SELECT u.id,u.auth_type,u.name,u.lastname,u.middlename,u.username,u.suspended,u.alt_id,u.iin FROM users u
      JOIN roles r ON r.user_id = u.id
      WHERE role = '${role}';
    `;
    const [res] = await query_f(query_str);
    return res;
  },

  get_assotiated_id_arr_by_role: async (role) => {
    //SELECT GROUP_CONCAT(assotiated_id) AS str FROM roles WHERE role = '${role}';
    const query_str = `
      SELECT user_id,assotiated_id FROM roles WHERE role = '${role}';
    `;

    //const [ [ { str } ] ] = await query_f(query_str);
    //return str;
    const [res] = await query_f(query_str);
    return res;
  },

  get_assotiated_id_arr_by_role_test: async (role) => {
    //SELECT GROUP_CONCAT(assotiated_id) AS str FROM roles WHERE role = '${role}';
    const query_str = `
    SELECT user_id,assotiated_id,dr.approved FROM roles 
    left join users on users.id=roles.user_id
    left join dormrequests dr on users.iin=dr.iin 
    WHERE role = '${role}';
    `;

    //const [ [ { str } ] ] = await query_f(query_str);
    //return str;
    const [res] = await query_f(query_str);
    return res;
  },

  delete_user_by_iin: async (iin) => {
    try {
      let query_str = `select * from users where iin='${iin}';`;
      const [user] = await query_f(query_str);
      query_str = `delete from users where iin='${iin}';`;
      await query_f(query_str);
      query_str = `delete from roles where user_id='${user.id}';`;
      await query_f(query_str);
      query_str = `delete from kpi_scores where userid='${user.id}';`;
      await query_f(query_str);
      return `${user.lastname, ' ', user.name} deleted.`;
    }
    catch (err) {
      return 'something went wrong: ', err;
    }
  },
  get_user_role: async (user_id, role) => {
    const query_str = `SELECT role FROM roles WHERE user_id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res.length === 0 ? undefined : res[0].role;
  },
  find_user_role: async (user_id, role) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id} AND role = '${role}';`;
    const [res] = await query_f(query_str);
    return res[0];
  },
  get_fileid_by_filename: async (filename) => {
    const query_str = `SELECT id from bonussystem_files where filename='${filename}';`;
    const [res] = await query_f(query_str);
    return res.length === 0 ? undefined : res[0].id;
  },
  get_bonus_points_by_id: async (userid) => {
    const d = new Date();
    const current_month = d.getMonth()+1;
    const current_year = d.getFullYear();
    let current_study_year = d.getFullYear();
    if ((d.getMonth() + 1) < 9) current_study_year-=1;
    const query_str = `SELECT 
    (
        (CASE WHEN auditorium_percentage > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN umkd > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN course_development > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN dot_content > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN certificates > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN science_event > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN grants > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN nirs > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN is_adviser > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN disciplinary_event > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN employer_cooperation > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN commission_participation > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN task_completion > 0 THEN 1 ELSE 0 END)
    ) AS points
FROM cafedra_bonus_general
WHERE userid = ${userid}
and relevant_date>='${current_year}-${current_month}-01'
and relevant_date<='${getLastDayOfMonth(current_year, current_month)}';`;
    const [res] = await query_f(query_str);
    const prof_query = `select proforientation_student_count as points from cafedra_bonus_proforientation where userid=${userid}
    and relevant_date>='${current_study_year}-06-01'
    and relevant_date<='${current_study_year+1}-05-31';`;
    const [prof_res] = await query_f(prof_query);
    let prof_points = 0;
    if (prof_res.length != 0) prof_points = prof_res[0].points
    const max_applicants = 9;
    const prof_ceiling = prof_points < max_applicants ? prof_points : max_applicants;
    return res.length === 0 ? undefined : res[0].points + Math.floor(prof_ceiling / 3);
  },
  update_bonussystem_data: async (userid, filetype, fileid) => {
    const query_str = `UPDATE cafedra_bonus_general SET ${filetype}=${fileid} where userid=${userid};`;
    const [res] = await query_f(query_str);
    return res;
  },
  update_bonussystem_prof_data: async (userid, proforientation) => {
    const d = new Date();
    let current_study_year = d.getFullYear();
    if ((d.getMonth() + 1) < 9) current_study_year-=1;
    const query_str = `UPDATE cafedra_bonus_proforientation
    SET proforientation_student_count=${proforientation}
    where userid=${userid}
    and relevant_date>='${current_study_year}-06-01'
    and relevant_date<='${current_study_year+1}-05-31';`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutors_CSEI_list: async () => {
    const query_str = `SELECT 
    u.id AS userid,
    concat(u.lastname,' ',u.name,' ',u.middlename) as fio,
    COALESCE(cbg.grants, 0) AS grants,
    cbg.relevant_date
FROM 
    users u
join roles r on r.user_id=u.id
LEFT JOIN 
    cafedra_bonus_general cbg
ON 
    u.id = cbg.userid
WHERE 
    r.role = 'plt_tutor' and u.suspended=0 and
    (cbg.relevant_date IS NULL OR 
    (MONTH(cbg.relevant_date) = MONTH(CURDATE()) AND 
     YEAR(cbg.relevant_date) = YEAR(CURDATE())))
order by grants desc, fio;`;
    const [res] = await query_f(query_str);
    return res;
  },
  update_CSEI_data: async (userid, number) => {
    const d = new Date();
    const current_month = d.getMonth()+1;
    const current_year = d.getFullYear();
    const query_find = `select userid from cafedra_bonus_general
    where userid = ${userid} and relevant_date>='${current_year}-${current_month}-01'
    and relevant_date<='${getLastDayOfMonth(current_year, current_month)}';`;
    const [find_res] = await query_f(query_find);
    if (find_res.length == 0) {
      const empty_data = {
        userid: userid, 
        relevant_date: common.human_date(new Date())
      };
      await db.create_row("cafedra_bonus_general", empty_data);
    }
    const query_str = `UPDATE cafedra_bonus_general
    SET grants = ${number}
    where userid = ${userid}
    and relevant_date>='${current_year}-${current_month}-01'
    and relevant_date<='${getLastDayOfMonth(current_year, current_month)}';`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_cafedra_manager_info: async (user_id) => {
    const query_str = `SELECT cafedraid from cafedra_manager_assignment cma join users u on u.id=cma.userid where u.id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res.length === 0 ? 0 : res[0].cafedraid;
  },
  get_faculty_manager_info: async (user_id) => {
    const query_str = `SELECT cafedraid from dean_assignment da join users u on u.id=da.userid where u.id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res.length === 0 ? 0 : res[0].cafedraid;
  },
  get_filename: async (file_id) => {
    const query_str = `SELECT filename from files where id=${file_id};`;
    const [res] = await query_f(query_str);
    return res[0].filename;
  },
  get_filename_bonus: async (file_id) => {
    const query_str = `SELECT filename from bonussystem_files where id=${file_id};`;
    const [res] = await query_f(query_str);
    return res[0].filename;
  },
  get_debt_data_by_iin: async (iin) => {
    const query_str = `SELECT iin, debt, overall from student_debt where iin=${iin};`;
    const [res] = await query_f(query_str);
    return res;
  },
  debt_update: async (debt_data) => {
    const clear_table_query = `delete from student_debt;`;
    await query_f(clear_table_query);
    for (const item of debt_data) {
      const insert_query = `insert into student_debt (fio,iin,overall,debt) values ('${item.FIO}','${item.iin}','${item.overall}','${item.debt}');`;
      await query_f(insert_query);
    }
    return 'update complete';
  },
  attendance_update: async (attendance_data,table) => {
    const values = attendance_data
      .map(row => {
        const rowValues = Object.values(row)
          .map(value => (typeof value === "string" ? `'${value}'` : value))
          .join(", ");
        return `(${rowValues})`;
      })
      .join(",\n");
    const insert_query = `INSERT INTO ${table} (firstname,lastname,iin,department,date,checkin,checkout) VALUES\n${values};`;
    await query_f(insert_query);
    return 'update complete';
  },
  delete_student_attendance_duplicates: async () => {
    const query_str = `WITH unique_rows AS (
      SELECT MIN(id) AS id
      FROM student_attendance
      GROUP BY iin, firstname, lastname, date, checkin, checkout
    )
    DELETE FROM student_attendance
    WHERE id NOT IN (SELECT id FROM unique_rows);`;
    const [res] = await query_f(query_str);
    return res;
  },
  delete_employee_attendance_duplicates: async () => {
    const query_str = `WITH unique_rows AS (
      SELECT MIN(id) AS id
      FROM employee_attendance
      GROUP BY iin, firstname, lastname, date, checkin, checkout
    )
    DELETE FROM employee_attendance
    WHERE id NOT IN (SELECT id FROM unique_rows);`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_student_attendance_data_for_prev_month: async (month, year) => {
    const query_str = `
    select concat(firstname,' ',lastname) as fio, department, DATE_FORMAT(date, '%d.%m.%Y') as date,checkin,checkout from student_attendance
    where date>='${year}-${month}-01'
    and date<='${getLastDayOfMonth(year,month)}';
    `;
    const [res] = await query_f(query_str);
    return res;
  },
  get_attendance_data_by_iin: async (iin, limit) => {
    const query_str = `select concat(firstname,' ',lastname) as fio,date,checkin,checkout from student_attendance where iin='${iin}' order by date desc limit ${limit};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_attendance_data_by_lastname: async (lastname, limit) => {
    const query_str = `select concat(firstname,' ',lastname) as fio,DATE_FORMAT(date, '%d.%m.%Y') as date,checkin,checkout from student_attendance where firstname like '%${lastname.trim()}%' order by date desc limit ${limit};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_attendance_data_by_iin_employee: async (iin, limit) => {
    const query_str = `select concat(firstname,' ',lastname) as fio,DATE_FORMAT(date, '%d.%m.%Y') as date,checkin,checkout from employee_attendance where iin='${iin}' order by date desc limit ${limit};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_attendance_data_specialties: async (month,year) => {
    const query_str = `SELECT department,COUNT(*) AS count
    FROM (
        SELECT DISTINCT department, firstname, lastname, iin
        FROM yii_form.student_attendance
        where date>='${year}-${month}-01'
        and date<='${getLastDayOfMonth(year,month)}'
        and department not in ('Students','Бизнеса и управления','Прикладных наук')
    ) AS unique_records
    group by department;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutors_penalty_list: async () => {
    const query_str = `SELECT 
    u.id AS userid,
    concat(u.lastname,' ',u.name,' ',u.middlename) as fio,
    COALESCE(tp.penalty_hr, 0) AS penalty_hr,
    COALESCE(tp.penalty_ed, 0) AS penalty_ed,
    tp.relevant_date
FROM 
    users u
join roles r on r.user_id=u.id
LEFT JOIN 
    tutor_penalties tp
ON 
    u.id = tp.userid
WHERE 
    r.role = 'plt_tutor' and u.suspended=0 and
    (tp.relevant_date IS NULL OR 
    (MONTH(tp.relevant_date) = MONTH(CURDATE()) AND 
     YEAR(tp.relevant_date) = YEAR(CURDATE())))
     order by penalty_hr desc, penalty_ed desc, fio;`;
    const [res] = await query_f(query_str);
    return res;
  },
  find_penalty_record_for_current_month: async (userid) => {
    const query_str = `select * from tutor_penalties tp
    where userid = ${userid} and
        (tp.relevant_date IS NULL OR 
        (MONTH(tp.relevant_date) = MONTH(CURDATE()) AND 
         YEAR(tp.relevant_date) = YEAR(CURDATE())));`;
    const [res] = await query_f(query_str);
    return res.length > 0 ? res[0]:undefined;
  },
  update_existing_penalty_record: async (userid,penalty_type,number) => {
    const query_str = `update tutor_penalties tp set ${penalty_type} = ${number}
    where userid = ${userid} and
        (tp.relevant_date IS NULL OR 
        (MONTH(tp.relevant_date) = MONTH(CURDATE()) AND 
         YEAR(tp.relevant_date) = YEAR(CURDATE())));`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutors_by_cafedra_id: async (cafedraid) => {
    const query_str = `SELECT ks.userid, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', ks.score from users u
    join kpi_scores ks on u.id = ks.userid
    where ks.cafedra = ${cafedraid} and u.suspended = 0 order by ks.score desc;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutor_bonus_data_userids: async (month,year) => {
    const query_str = `select userid from cafedra_bonus_general cbg
    join users u on u.id = cbg.userid
    join roles r on r.user_id = u.id
    where relevant_date>='${year}-${month}-01'
    and relevant_date<='${getLastDayOfMonth(year, month)}'
    and u.suspended = 0
    and r.role = 'plt_tutor';`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutor_bonus_data_by_user_id: async (id) => {
    const date = new Date();
    const current_month = date.getMonth()+1;
    const current_year = date.getFullYear();
    const query_str = `SELECT 
    cbg.userid,
    cbg.auditorium_percentage AS auditorium_percentage_fileid,
    bf1.filename AS auditorium_percentage_filename,
    cbg.umkd AS umkd_fileid,
    bf2.filename AS umkd_filename,
    cbg.course_development AS course_development_fileid,
    bf3.filename AS course_development_filename,
    cbg.dot_content AS dot_content_fileid,
    bf4.filename AS dot_content_filename,
    cbg.certificates AS certificates_fileid,
    bf5.filename AS certificates_filename,
    cbg.science_event AS science_event_fileid,
    bf6.filename AS science_event_filename,
    cbg.nirs AS nirs_fileid,
    bf13.filename AS nirs_filename,
    cbg.grants AS grants_fileid,
    bf14.filename AS grants_filename,
    cbg.is_adviser AS is_adviser_fileid,
    bf7.filename AS is_adviser_filename,
    cbg.disciplinary_event AS disciplinary_event_fileid,
    bf8.filename AS disciplinary_event_filename,
    cbg.employer_cooperation AS employer_cooperation_fileid,
    bf9.filename AS employer_cooperation_filename,
    cbg.proforientation AS proforientation_fileid,
    bf10.filename AS proforientation_filename,
    cbg.commission_participation AS commission_participation_fileid,
    bf11.filename AS commission_participation_filename,
    cbg.task_completion AS task_completion_fileid,
    bf12.filename AS task_completion_filename
FROM 
    cafedra_bonus_general cbg
LEFT JOIN bonussystem_files bf1 ON ABS(cbg.auditorium_percentage) = bf1.id
LEFT JOIN bonussystem_files bf2 ON ABS(cbg.umkd) = bf2.id
LEFT JOIN bonussystem_files bf3 ON ABS(cbg.course_development) = bf3.id
LEFT JOIN bonussystem_files bf4 ON ABS(cbg.dot_content) = bf4.id
LEFT JOIN bonussystem_files bf5 ON ABS(cbg.certificates) = bf5.id
LEFT JOIN bonussystem_files bf6 ON ABS(cbg.science_event) = bf6.id
LEFT JOIN bonussystem_files bf7 ON ABS(cbg.is_adviser) = bf7.id
LEFT JOIN bonussystem_files bf8 ON ABS(cbg.disciplinary_event) = bf8.id
LEFT JOIN bonussystem_files bf9 ON ABS(cbg.employer_cooperation) = bf9.id
LEFT JOIN bonussystem_files bf10 ON ABS(cbg.proforientation) = bf10.id
LEFT JOIN bonussystem_files bf11 ON ABS(cbg.commission_participation) = bf11.id
LEFT JOIN bonussystem_files bf12 ON ABS(cbg.task_completion) = bf12.id
LEFT JOIN bonussystem_files bf13 ON ABS(cbg.nirs) = bf13.id
LEFT JOIN bonussystem_files bf14 ON ABS(cbg.grants) = bf14.id
WHERE 
    cbg.userid = ${id}
    and relevant_date>='${current_year}-${current_month}-01'
    and relevant_date<='${getLastDayOfMonth(current_year, current_month)}';
`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res : undefined;
  },
  get_tutor_proforientation_data_by_user_id: async (id) => {
    const d = new Date();
    let current_year = d.getFullYear();
    if ((d.getMonth() + 1) < 9) current_year-=1;
    const query_str = `select proforientation_student_count from cafedra_bonus_proforientation 
    where userid=${id}
    and relevant_date>='${current_year}-06-01'
    and relevant_date<='${current_year+1}-05-31';`;
    const [res] = await query_f(query_str);
    return res[0];
  },
  confirm_if_fileless_category_unconfirmed: async (confirmed_for, category) => {
    let query_str = `select ${category} from cafedra_bonus_general where userid=${confirmed_for};`;
    const [res] = await query_f(query_str);
    if (Object.values(res[0]) < 1) {
      query_str = `update cafedra_bonus_general set ${category}=1 where userid=${confirmed_for};`;
      const [result] = await query_f(query_str);
      return result;
    }
    else {
      return 'Already confirmed';
    }
  },
  confirm_if_category_unconfirmed: async (confirmed_for, category) => {
    let query_str = `select ${category} from cafedra_bonus_general where userid=${confirmed_for};`;
    const [res] = await query_f(query_str);
    if (Object.values(res[0]) < 0) {
      query_str = `update cafedra_bonus_general set ${category}=${Object.values(res[0]) * -1} where userid=${confirmed_for};`;
      const [result] = await query_f(query_str);
      return result;
    }
    else {
      return 'Already confirmed';
    }
  },
  deny_if_category_unconfirmed: async (denied_for, category) => {
    let query_str = `select ${category} from cafedra_bonus_general where userid=${denied_for};`;
    const [res] = await query_f(query_str);
    if (Object.values(res[0]) < 0) {
      query_str = `update cafedra_bonus_general set ${category}=0 where userid=${denied_for};`;
      const [result] = await query_f(query_str);
      return result;
    }
    else {
      return 'Already denied / does not exist';
    }
  },
  get_bonus_filename_by_category: async (denied_for, category) => {
    let query_str = `select ${category} from cafedra_bonus_general where userid=${denied_for};`;
    let [res] = await query_f(query_str);
    const fileid = Object.values(res[0]) * -1;
    query_str = `select filename from bonussystem_files where id=${fileid};`;
    [res] = await query_f(query_str);
    return res[0].filename;
  },
  delete_bonus_file_from_db_by_filename: async (filename) => {
    const query_str = `delete from bonussystem_files where filename='${filename}';`;
    let [res] = await query_f(query_str);
    return res;
  },
  get_dashboard_data: async () => {
    const query_str = `SELECT 
    (SELECT COUNT(id) FROM librarybooks WHERE DeletedUndeleted = 'true') AS 'librarybook_count',
    (SELECT COUNT(id) FROM ebooks WHERE DeletedUndeleted = 'true') AS 'ebook_count',
    (SELECT COUNT(id) FROM dormrequests WHERE approved = 1) AS 'student_dorm_count',
    (SELECT COUNT(id) FROM cert_records WHERE created BETWEEN '2023-09-01 00:00:00' AND '2024-06-30 23:59:59') AS '2023-2024_certif_count',
    (SELECT COUNT(id) FROM cert_records WHERE created BETWEEN '2024-09-01 00:00:00' AND CURRENT_TIMESTAMP()) AS '2024-actual_certif_count',
    (SELECT COUNT(id) FROM files) AS 'kpi_file_count',
    (SELECT COUNT(id) FROM photos) AS 'faceid_photo_count';`;
    const [res] = await query_f(query_str);
    return res[0];
  },
  get_tutors_by_cafedra_id_for_manager: async (cafedraid) => {
    const query_str = `SELECT ks.userid, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', ast.nameru as 'academicstatus' from users u
    join kpi_scores ks on u.id = ks.userid
    join academicstatus ast on ks.academicstatusid = ast.id
    where ks.cafedra = ${cafedraid} and u.suspended=0 and u.id not in (select userid from cafedra_manager_assignment) order by fio;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutors_by_faculty: async (userid) => {
    const query_str = `SELECT ks.userid, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', ast.nameru as 'academicstatus' from users u
    join kpi_scores ks on u.id = ks.userid
    join academicstatus ast on ks.academicstatusid = ast.id
    where ks.cafedra in (select cafedraid from dean_assignment where userid=${userid}) and u.suspended=0 and u.id in (select userid from cafedra_manager_assignment) order by fio;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_total_scores_for_userid: async (userid) => {
    const query_str = `select ROW_NUMBER() over() as counter, kac.category_name as category, sum(ka.primaryscore) as scoresum from files f
    join kpi_activities ka on f.activityid=ka.id
    join kpi_activity_categories kac on ka.categoryid = kac.id
    where f.userid=${userid}
    group by ka.categoryid
    order by ka.categoryid;`;
    let [res] = await query_f(query_str);
    return res;
  },
  get_top_ten_tutors_by_score: async (toptentype) => {
    let query_str;
    if (toptentype == 0 || toptentype == 1) {
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid in (0,1)
      order by ks.score desc
      limit 10;`;
    }
    else if (toptentype == 2 || toptentype == 4) {
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid in (2,4)
      order by ks.score desc
      limit 10;`;
    }
    else if (toptentype == 3 || toptentype == 5) {
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid in (3,5)
      order by ks.score desc
      limit 10;`;
    }
    else {
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid=${toptentype}
      order by ks.score desc
      limit 10;`;
    }
    const [res] = await query_f(query_str);
    return res;
  },
  get_top_ten_tutors_overall_by_score: async () => {
    const query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
    join kpi_scores ks on u.id = ks.userid
    join cafedras c on ks.cafedra = c.id
    order by ks.score desc
    limit 10;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_tutor_plt_data: async (user_id) => {
    const query_str = `SELECT * from kpi_scores ks
    where ks.userid=${user_id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_cafedra_stats: async () => {
    const query_str = `SELECT c.id, c.cafedraNameRU, sum(score) as scoresum, count(*) tutorcount from kpi_scores ks
    join cafedras c on ks.cafedra = c.id
    group by ks.cafedra
    order by scoresum desc;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_bonus_level: async (score) => {
    if (score >= 0 && score < 6) return 0;
    if (score >= 6 && score < 12) return 1;
    if (score >= 12) return 2;
    return -1;
  },
  find_cert_record: async (cert_id) => {
    const query_str = `SELECT * FROM cert_records WHERE id = ${cert_id};`;
    const [res] = await query_f(query_str);
    return res[0];
  },
  check_upload_eligibility: async (activityid, user_id) => {
    const query_str = `select * from files f
      join kpi_activities ka on f.activityid = ka.id
      where f.activityid = ${activityid}
      and ka.isunique=1
      and f.userid=${user_id};`
    const [res] = await query_f(query_str);
    return res.length === 0;
  },
  get_cert_records_by_user_id: async (user_id) => {
    const query_str = `SELECT * FROM cert_records WHERE user_id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_excel_doc_date: async () => {
    const query_str = `SELECT upload_date FROM excel_data order by id desc limit 1;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_file_records_by_user_id: async (user_id) => {
    const query_str = `select f.id, ka.name, f.file_path, f.extradata1, f.filename, f.upload_date, ka.primaryscore from files f
    join kpi_activities ka on f.activityid=ka.id
    where f.userid = ${user_id} 
    order by f.id desc;`;
    const [res] = await query_f(query_str);
    return res;
  },
  delete_library_book: async (id) => {
    const query_str = `update librarybooks set deletedundeleted='false' where id=${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  delete_e_book: async (id) => {
    const query_str = `update ebooks set deletedundeleted='false' where id=${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  edit_e_book: async (id, Name, Author, Pages, LLC, ISBN, Language, PublishedCountryCity, PublishedTime, PublishingHouse, RLibraryCategoryRLibraryBook, UDC) => {
    const query_str = `update ebooks 
      set namerubook='${Name}',
      Author='${Author}',
      Pages='${Pages}', 
      LLC='${LLC}',
      ISBN='${ISBN}',
      Language='${Language}',
      PublishedCountryCity='${PublishedCountryCity}',
      PublishedTime='${PublishedTime}',
      PublishingHouse='${PublishingHouse}',
      RLibraryCategoryRLibraryBook=${RLibraryCategoryRLibraryBook},
      UDC='${UDC}' 
      where id=${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  edit_library_book: async (id, Name, Author, Pages, Annotation, Barcode, Heading, ISBN, InventoryNumber, KeyWords, LLC, Language, Price, PublishedCountryCity, PublishedTime, PublishingHouse, RLibraryCategoryRLibraryBook, TypeOfBook, UDC) => {
    const query_str = `update librarybooks 
      set namerubook='${Name}',
      Author='${Author}',
      Pages='${Pages}',
      Annotation='${Annotation}',
      Barcode='${Barcode}',
      Heading='${Heading}',
      ISBN='${ISBN}',
      InventoryNumber='${InventoryNumber}',
      KeyWords='${KeyWords}',
      LLC='${LLC}',
      Language='${Language}',
      Price='${Price}',
      PublishedCountryCity='${PublishedCountryCity}',
      PublishedTime='${PublishedTime}',
      PublishingHouse='${PublishingHouse}',
      RLibraryCategoryRLibraryBook=${RLibraryCategoryRLibraryBook},
      TypeOfBook='${TypeOfBook}', 
      UDC='${UDC}' 
      where id=${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  resolve_book_transfer: async (id, date) => {
    const query_str = `update booktransfer set resolved='true', dateresolved='${date}' where id=${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_due_books: async () => {
    const query_str = `select bt.id, bt.userid, concat(u.lastname, ' ', u.name, ' ', u.middlename) as fio, lb.namerubook as bookname, lb.barcode as barcode, r.role as role, bt.DateCreated from booktransfer bt
      join users u on bt.userid = u.id
      join librarybooks lb on bt.bookid = lb.id
      join roles r on r.user_id = u.id
      where resolved='false' order by bt.id desc;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_due_books_for_user: async (user_id) => {
    const query_str = `select bt.id, lb.namerubook as bookname, r.role as role, bt.DateCreated from booktransfer bt
      join users u on bt.userid = u.id
      join librarybooks lb on bt.bookid = lb.id
      join roles r on r.user_id=u.id
      where resolved='false' and bt.userid = ${user_id} order by bt.id desc;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_e_book_page_count: async () => {
    const query_str = `select count(*) as count from ebooks where deletedundeleted='true' and ebookpath not like '%:%';`;
    const [res] = await query_f(query_str);
    return Math.floor(res[0].count / 1000 + 1)
  },
  get_e_books_per_page: async (page) => {
    const query_str = `select eb.*, bc.name as bookcat from ebooks eb join bookcategory bc on bc.id = eb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and ebookpath not like '%:%' order by eb.namerubook limit 1000 offset ${(page - 1) * 1000};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_book_page_count: async () => {
    const query_str = `select count(*) as count from librarybooks where deletedundeleted='true';`;
    const [res] = await query_f(query_str);
    return Math.floor(res[0].count / 1000 + 1)
  },
  // get_all_physical_books: async () => {
  //   const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' order by lb.id desc;`;
  //   const [res] = await query_f(query_str);
  //   return res;
  // },
  get_physical_books_by_filter: async (name, author) => {
    const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and lb.NameRuBook like '%${mysql_real_escape_string(name).trim()}%' and lb.Author like '%${mysql_real_escape_string(author).trim()}%' order by lb.NameRuBook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_e_books_by_filter: async (name, author) => {
    const query_str = `select eb.*, bc.name as bookcat from ebooks eb join bookcategory bc on bc.id = eb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and ebookpath not like '%:%' and NameRuBook like '%${mysql_real_escape_string(name)}%' and Author like '%${mysql_real_escape_string(author)}%' order by eb.namerubook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_books_by_name: async (name) => {
    const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and lb.NameRuBook like '%${name}%' order by lb.NameRuBook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_books_by_isbn: async (isbn) => {
    const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and lb.ISBN like '%${isbn}%' order by lb.NameRuBook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_books_by_keywords: async (keywords) => {
    const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and lb.KeyWords like '%${keywords}%' order by lb.NameRuBook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_books_by_inventory: async (inventory) => {
    const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and lb.InventoryNumber like '%${inventory}%' order by lb.NameRuBook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_books_by_barcode: async (barcode) => {
    const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' and lb.Barcode like '%${barcode}%' order by lb.NameRuBook limit 1000;`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_books_per_page: async (page) => {
    const query_str = `select lb.*, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' order by lb.namerubook limit 1000 offset ${(page - 1) * 1000};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_physical_book_by_id: async (id) => {
    const query_str = `select * from librarybooks where id=${id};`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_e_book_by_id: async (id) => {
    const query_str = `select * from ebooks where id=${id};`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_book_categories: async () => {
    const query_str = `select * from bookcategory where deleted = false;`;
    const [res] = await query_f(query_str);
    return res;
  },
  duplicate_book_by_id: async (id) => {
    const query_str = `INSERT INTO librarybooks (
      AdditionalInformation, Annotation, ArrivingAct, Author, Barcode, CopyrightSigns,
      CoverPage, DateCreated, DeletedUndeleted, DepartingAct, EditedBy, Exchanged, Heading,
      ISBN, ISSN, InventoryNumber, IsCD, IsGift, IsOut, KeyWords, LLC, Language,
      MONRecomended, NameEnBook, NameKZBook, NameRuBook, NoteAboutControl, Pages,
      Price, PublishedCountryCity, PublishedTime, PublishingHouse, RLibraryCategoryRLibraryBook,
      Series, Speciality, Subject, TypeOfBook, UDC
    )
    SELECT
      AdditionalInformation, Annotation, ArrivingAct, Author, Barcode, CopyrightSigns,
      CoverPage, DateCreated, DeletedUndeleted, DepartingAct, EditedBy, Exchanged, Heading,
      ISBN, ISSN, InventoryNumber, IsCD, IsGift, IsOut, KeyWords, LLC, Language,
      MONRecomended, NameEnBook, NameKZBook, NameRuBook, NoteAboutControl, Pages,
      Price, PublishedCountryCity, PublishedTime, PublishingHouse, RLibraryCategoryRLibraryBook,
      Series, Speciality, Subject, TypeOfBook, UDC
    FROM librarybooks
    WHERE id = ${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_library_statistics_by_year: async (year) => {
    let nYear = parseInt(year);
    const query_str = `SELECT 
    COUNT(CASE WHEN DateCreated>'${nYear}-09-01 00:00:00' and DateCreated<'${nYear + 1}-08-31 23:59:00' THEN 1 END) AS booksgiven,
    COUNT(CASE WHEN resolved = 'false' THEN 1 END) AS booksonhand,
    COUNT(CASE WHEN resolved = 'true' and DateResolved>'${nYear}-09-01 00:00:00' and DateResolved<'${nYear + 1}-08-31 23:59:00' THEN 1 END) AS booksreturned
FROM 
    booktransfer;`;
    const [res] = await query_f(query_str);
    return res;
  },
  delete_file_by_filename: async (filename) => {
    const query_str = `delete from files where filename = '${filename}';`;
    const [res] = await query_f(query_str);
    return res;
  },
  find_photo_data_for_admin: async (iin) => {
    const query_str = `select photos.id,photos.iin,name,lastname,middlename,DateCreated from users
    join photos on photos.iin = users.iin
    where photos.iin='${iin}';`;
    const [res] = await query_f(query_str);
    return res;
  },
  delete_photo_by_id: async (id) => {
    const query_str = `delete from photos where id = ${id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_activities_by_category: async (categoryid) => {
    const query_str = `select * from kpi_activities where categoryid=${categoryid};`;
    const [res] = await query_f(query_str);
    return res;
  },

  get_notification_icon_data: async (user_id) => {
    const query_str = `SELECT 
    COUNT(n.id) AS notif_count,
    IFNULL(SUM(n.viewed = 0), 0) AS unread_count,
    IFNULL(SUM(n.viewed = 0 AND nt.isimportant = 1), 0) AS important_unread_count
FROM 
    notifications n
JOIN 
    notificationtypes nt ON n.notificationtype_id = nt.id
WHERE 
    n.receiver_id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  get_notifications_for_user: async (user_id) => {
    const query_str = `select n.id,u.lastname,u.name,nt.name as notification_name, n.message, nt.ispersonal, isimportant, n.date_sent, n.date_viewed, n.viewed from notifications n 
    join notificationtypes nt on n.notificationtype_id=nt.id
    left join users u on u.id = n.sender_id
    where n.receiver_id=${user_id} order by nt.isimportant desc, date_sent desc;`
    const [res] = await query_f(query_str);
    return res;
  },
  mark_notification_as_read_by_id: async (id, date) => {
    const query_str = `update notifications set viewed=1, date_viewed='${date}' where id=${id};`
    const [res] = await query_f(query_str);
    return res;
  },
  count_kpi_score_by_iin: async (iin) => {
    const query_str = `select ka.primaryscore from files f
    join kpi_activities ka on f.activityid=ka.id
    join users u on f.userid = u.id
    where u.iin = ${iin};`;
    const [res] = await query_f(query_str);
    //console.log(res[1].primaryscore);
    let score = 0;
    for (let i = 0; i < res.length; i++) {
      score += res[i].primaryscore;
    }
    return score;
  },
  count_kpi_score_by_iin_base: async (iin) => {
    const max_year_gap_base = 1;
    const today = new Date();
    const current_year = today.getFullYear()
    let query_str = `select ka.primaryscore, kac.coef from files f
    join kpi_activities ka on f.activityid=ka.id
    join kpi_activity_categories kac on ka.categoryid = kac.id
    join users u on f.userid = u.id
    where u.iin = ${iin}
    and ka.isbase=1
    and ka.id != 26
    and f.upload_date>='${current_year - max_year_gap_base}-09-01 00:00:00';`;
    let [res] = await query_f(query_str);
    let score = 0;
    for (let i = 0; i < res.length; i++) {
      score += res[i].primaryscore;
      //console.log(res[i].primaryscore, '*', res[i].coef,'=',res[i].primaryscore*res[i].coef);
    }
    query_str = `select ka.primaryscore, f.extradata1, kac.coef from files f
    join kpi_activities ka on f.activityid=ka.id
    join kpi_activity_categories kac on ka.categoryid = kac.id
    join users u on f.userid = u.id
    where u.iin = ${iin}
    and ka.id = 26
    and f.upload_date>='${current_year - max_year_gap_base}-09-01 00:00:00';`;
    [res] = await query_f(query_str);
    if (res[0]) {
      if (res[0].extradata1 != undefined && res[0].extradata1 != null && res[0].extradata1 != '') {
        if (res[0].extradata1 <= 10) {
          score += res[0].primaryscore * parseInt(res[0].extradata1);
        }
        else {
          score += res[0].primaryscore * 10;
        }
      }
    }
    return score;
  },
  count_kpi_score_by_iin_advanced: async (iin) => {
    const max_year_gap_advanced = 5;
    const today = new Date();
    const current_year = today.getFullYear()
    const query_str = `select ka.primaryscore, kac.coef from files f
    join kpi_activities ka on f.activityid=ka.id
    join kpi_activity_categories kac on ka.categoryid = kac.id
    join users u on f.userid = u.id
    where u.iin = ${iin}
    and ka.isbase=0
    and f.upload_date>='${current_year - max_year_gap_advanced}-09-01 00:00:00';`;
    const [res] = await query_f(query_str);
    let score = 0;
    for (let i = 0; i < res.length; i++) {
      score += res[i].primaryscore;
    }
    return score;
  },
  get_faculty_stats: async () => {
    let query_str = `SELECT sum(score) as scoresum, count(*) tutorcount from kpi_scores ks
    join cafedras c on ks.cafedra = c.id
    where c.facultyNameRU like '%Прикладных%'
    group by ks.cafedra;`;
    let [res] = await query_f(query_str);
    let scoreAppliedSciences = 0;
    let tutorsAppliedSciences = 0;
    for (let i = 0; i < res.length; i++) {
      scoreAppliedSciences += parseInt(res[i].scoresum);
      tutorsAppliedSciences += res[i].tutorcount;
    }
    query_str = `SELECT sum(score) as scoresum, count(*) tutorcount from kpi_scores ks
    join cafedras c on ks.cafedra = c.id
    where c.facultyNameRU like '%Бизнес%'
    group by ks.cafedra;`;
    [res] = await query_f(query_str);
    let scoreBusinessAndManagement = 0;
    let tutorsBusinessAndManagement = 0;
    for (let i = 0; i < res.length; i++) {
      scoreBusinessAndManagement += parseInt(res[i].scoresum);
      tutorsBusinessAndManagement += res[i].tutorcount;
    }
    let data = [{
      id: 1,
      facultyname: 'Факультет прикладных наук',
      scoresum: scoreAppliedSciences,
      tutorcount: tutorsAppliedSciences
    },
    {
      id: 2,
      facultyname: 'Факультет бизнеса и управления',
      scoresum: scoreBusinessAndManagement,
      tutorcount: tutorsBusinessAndManagement
    }
    ]
    return data;
  },

  create_row: async (table_name, data) => {
    let insert_columns_str = [];
    let insert_data_str = [];

    for (const [key, value] of Object.entries(data)) {
      if (key === "id") continue;
      if (key === "created") continue;
      if (value === undefined) continue;
      if (value === null) continue;

      // if (value === null) {
      //   console.log(key,value);
      // }

      let final_value = value;
      if (final_value instanceof Date && !isNaN(final_value)) final_value = format_date(final_value);
      else if (typeof final_value === "object" && typeof final_value.toString === "function") final_value = final_value.toString();
      else if (typeof final_value === "object") final_value = JSON.toString(final_value);

      if (typeof final_value === "string") final_value = `'${mysql_real_escape_string(final_value)}'`;
      //if (final_value === null) final_value = `null`;

      insert_columns_str.push(key);
      insert_data_str.push(final_value);
    }

    const insert_str = `INSERT INTO ${table_name} (${insert_columns_str.join(",")}) VALUES (${insert_data_str.join(",")});`;

    return await transaction_f(async (con) => {
      await con.query(insert_str);
      return await last_insert_id_f(con);
    });

    //return id;
  },
};

module.exports = db;