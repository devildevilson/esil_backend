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
  connectionLimit: 10,
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
    let kpi_scopus_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'Scopus');
    let kpi_monograph_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'monograph');
    let kpi_international_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'international');
    let kpi_wos_count = await plt.get_pub_count_by_iin_and_edition_index(iin, 'Web of Science');
    let kpi_nirs_count = await plt.get_nirs_count_by_iin(iin);
    let kpi_nirs_count_manager = await plt.get_nirs_count_manager_by_iin(iin);
    let kpi_tia_count = await plt.get_tia_count_by_iin(iin);
    let h_index = await plt.get_h_index(iin);
    let hindex_scopus = 0, hindex_wos = 0;
    let kpiscore_base = kpiscore_cloud_base + kpi_kkson_count.pubcount * 7 + kpi_international_count.pubcount * 3;
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
  find_user_by_username: async (username) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,password,suspended,alt_id FROM users WHERE username = '${mysql_real_escape_string(username)}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  find_user_by_id: async (userid) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,iin,suspended,alt_id FROM users WHERE id = '${userid}';`;
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
  approve_dorm_request_by_iin: async (iin,dormtype,message,roomnumber,datemodified) => {
    let ishostel;
    if(dormtype=='dorm') ishostel='0';
    if(dormtype=='hostel') ishostel='1';
    const query_str = `update dormrequests set approved = 1, ishostel = ${ishostel}, notification_message = '${message}', roomnumber = '${roomnumber}', datemodified = '${datemodified}' where iin = '${iin}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  deny_dorm_request_by_iin: async (iin,message,datemodified) => {
    const query_str = `update dormrequests set approved = -1, notification_message = '${message}', datemodified = '${datemodified}' where iin = '${iin}';`;
    const [res] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_user_roles: async (user_id) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id};`;
    const [res] = await query_f(query_str);
    return res;
  },
  check_book_transfer_eligibility: async (user_id, book_id) =>{
    const query_str = `SELECT count(*) as sum from booktransfer where userid=${user_id} and bookid=${book_id} and resolved='false';`;
    const [res] = await query_f(query_str);
    return res;
  },
  check_photo_upload_eligibility: async (iin) =>{
    const query_str = `SELECT count(*) as sum from photos where iin='${iin}';`;
    const [res] = await query_f(query_str);
    return res[0].sum==0;
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

  find_user_role: async (user_id, role) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id} AND role = '${role}';`;
    const [res] = await query_f(query_str);
    return res[0];
  },
  get_filename: async (file_id) => {
    const query_str = `SELECT filename from files where id=${file_id};`;
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
  get_tutors_by_cafedra_id: async (cafedraid) => {
    const query_str = `SELECT ks.userid, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', ks.score from users u
    join kpi_scores ks on u.id = ks.userid
    where ks.cafedra = ${cafedraid} order by ks.score desc;`;
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
  edit_e_book: async (id, Name, Author, Pages, LLC, Language, PublishedCountryCity, PublishedTime, PublishingHouse, RLibraryCategoryRLibraryBook, TypeOfBook, UDC) => {
    const query_str = `update librarybooks 
      set namerubook='${Name}',
      Author='${Author}',
      Pages='${Pages}', 
      LLC='${LLC}',
      Language='${Language}',
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
  resolve_book_transfer: async (id,date) => {
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
  get_e_book_page_count: async () =>{
    const query_str = `select count(*) as count from ebooks where deletedundeleted='true';`;
    const [res] = await query_f(query_str);
    return Math.floor(res[0].count/1000+1)
  },
  get_e_books_per_page: async (page) => {
    const query_str = `select eb.*, bc.name as bookcat from ebooks eb join bookcategory bc on bc.id = eb.RLibraryCategoryRLibraryBook where deletedundeleted='true' order by eb.namerubook limit 1000 offset ${(page-1)*1000};`;
    const [res] = await query_f(query_str);
    return res;
  }, 
  get_physical_book_page_count: async () =>{
    const query_str = `select count(*) as count from librarybooks where deletedundeleted='true';`;
    const [res] = await query_f(query_str);
    return Math.floor(res[0].count/1000+1)
  },
  // get_all_physical_books: async () => {
  //   const query_str = `select lb.id, NameRuBook,Author,Annotation,Subject,InventoryNumber,Barcode,KeyWords,Language,Pages,Price,TypeOfBook,RLibraryCategoryRLibraryBook,PublishedTime,PublishedCountryCity,ISBN, PublishingHouse, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' order by lb.id desc;`;
  //   const [res] = await query_f(query_str);
  //   return res;
  // },
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
    const query_str = `select lb.*, bc.name as bookcat from librarybooks lb join bookcategory bc on bc.id = lb.RLibraryCategoryRLibraryBook where deletedundeleted='true' order by lb.namerubook limit 1000 offset ${(page-1)*1000};`;
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
  duplicate_book_by_id: async(id)=>{
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
    COUNT(CASE WHEN DateCreated>'${nYear}-09-01 00:00:00' and DateCreated<'${nYear+1}-08-31 23:59:00' THEN 1 END) AS booksgiven,
    COUNT(CASE WHEN resolved = 'false' THEN 1 END) AS booksonhand,
    COUNT(CASE WHEN resolved = 'true' and DateResolved>'${nYear}-09-01 00:00:00' and DateResolved<'${nYear+1}-08-31 23:59:00' THEN 1 END) AS booksreturned
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
  find_photo_data_for_admin: async (iin) =>{
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

  get_notification_icon_data : async (user_id) => {
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
  get_notifications_for_user: async (user_id) =>{
    const query_str = `select n.id,u.lastname,u.name,nt.name as notification_name, n.message, nt.ispersonal, isimportant, n.date_sent, n.date_viewed, n.viewed from notifications n 
    join notificationtypes nt on n.notificationtype_id=nt.id
    left join users u on u.id = n.sender_id
    where n.receiver_id=${user_id} order by nt.isimportant desc, date_sent desc;`
    const [res] = await query_f(query_str);
    return res;
  },
  mark_notification_as_read_by_id: async (id,date) =>{
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