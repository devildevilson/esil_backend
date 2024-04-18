'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");
const plt = require("@apis/platonus");

const connection_config = {
  host     : process.env.CLOUD_DATABASE_HOST,
  port     : process.env.CLOUD_DATABASE_PORT,
  user     : process.env.CLOUD_DATABASE_USER,
  password : process.env.CLOUD_DATABASE_PASSWORD,
  database : process.env.CLOUD_DATABASE_NAME,
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
        return "\\"+char; // prepends a backslash to backslash, percent,
                          // and double/single quotes
      default: return char;
    }
  });
}

function good_num(num) { return num < 10 ? "0"+num : ""+num; }

function format_date(date) {
  const yyyy = good_num(date.getFullYear());
  const mm   = good_num(date.getMonth()+1);
  const dd   = good_num(date.getDate());
  const hh   = good_num(date.getHours());
  const MM   = good_num(date.getMinutes());
  const ss   = good_num(date.getSeconds());
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

const last_insert_id_f = async (con) => { const [ [ { id } ] ] = await con.query("SELECT LAST_INSERT_ID() AS id"); return id; }
const row_count_f = async (con) => { const [ [ { count } ] ] = await con.query("SELECT ROW_COUNT() AS count"); return count; }

const db = {
  close: async () => {
    await pool.end();
  },

  update_kpi_for_user: async (user_id) => {
    let query_str = `select iin from users
    join roles on users.id = roles.user_id
    where roles.user_id=${user_id};`;
    let [ iin_res ] = await query_f(query_str);
    let iin=iin_res[0].iin;
    let kpiscore_cloud_base = await db.count_kpi_score_by_iin_base(iin);
    let kpiscore_cloud_advanced = await db.count_kpi_score_by_iin_advanced(iin);
    let kpi_kkson_count = await plt.get_pub_count_by_iin_and_edition_index(iin,'Комитет по контролю в сфере образования и науки Министерства образования и науки Республики Казахстан (ККСОН МОН РК)');
    let kpi_scopus_count = await plt.get_pub_count_by_iin_and_edition_index(iin,'Scopus');
    let kpi_monograph_count = await plt.get_pub_count_by_iin_and_edition_index(iin,'monograph');
    let kpi_international_count = await plt.get_pub_count_by_iin_and_edition_index(iin,'international'); 
    let kpi_wos_count = await plt.get_pub_count_by_iin_and_edition_index(iin,'Web of Science');
    let kpi_nirs_count = await plt.get_nirs_count_by_iin(iin);
    let kpi_nirs_count_manager = await plt.get_nirs_count_manager_by_iin(iin);
    let kpi_tia_count = await plt.get_tia_count_by_iin(iin);
    let h_index = await plt.get_h_index(iin);
    let hindex_scopus=0, hindex_wos=0;
    let kpiscore_base = kpiscore_cloud_base+kpi_kkson_count.pubcount*7+kpi_international_count.pubcount*3;
    let kpiscore_advanced = kpiscore_cloud_advanced+kpi_scopus_count.pubcount*10+kpi_monograph_count.pubcount*10+kpi_wos_count.pubcount*10+kpi_nirs_count.total*20+kpi_nirs_count_manager.total*40+kpi_tia_count.total*5;
    if(h_index!=undefined) {
      if(h_index.hscopus!=undefined) hindex_scopus = h_index.hscopus;
      if(h_index.hwos!=undefined) hindex_wos = h_index.hwos;
    }
    let kpi_overall = 0;
    kpi_overall += kpiscore_base + kpiscore_advanced;
    if(hindex_scopus!=0 || hindex_wos!=0) {
      kpi_overall+=5;
      kpiscore_advanced+=5;
    }
    console.log(`combined kpiscore for ${user_id}`,kpi_overall);
    query_str = `SELECT userid from kpi_scores where userid=${user_id};`;
    let [ res ] = await query_f(query_str);
    let umkd_mdl_completion = await db.get_umkd_moodle_by_userid(user_id);
    const calculated_margin_mdl = Math.round(15/50*umkd_mdl_completion[0].umkd_mdl_completion-15);
    kpiscore_base+=calculated_margin_mdl;
    kpi_overall+=calculated_margin_mdl;
    if(res.length===0){
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
    else{
      query_str = `update kpi_scores set score=${kpi_overall}, score_base=${kpiscore_base}, score_advanced=${kpiscore_advanced}, kkson_count=${kpi_kkson_count.pubcount},scopus_count=${kpi_scopus_count.pubcount},wos_count=${kpi_wos_count.pubcount}, monograph_count=${kpi_monograph_count.pubcount}, international_count=${kpi_international_count.pubcount}, h_index_scopus=${hindex_scopus},h_index_wos=${hindex_wos},nirs_count=${kpi_nirs_count.total}, nirs_count_manager=${kpi_nirs_count_manager.total}, tia_count=${kpi_tia_count.total} where userid=${user_id};`;
      let [ res ] = await query_f(query_str);
      return res;
    }
    return res;
  },
  find_user_by_username: async (username) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,password,suspended,alt_id FROM users WHERE username = '${username}';`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  
  get_kpiscore_by_userid: async (user_id) => {
    const query_str = `SELECT score from kpi_scores where userid = ${user_id};`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_role_by_iin: async (inn) => {
    const query_str = `SELECT role from roles join users on users.id=roles.user_id where users.iin = ${inn};`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_umkd_moodle_by_userid: async (userid) => {
    const query_str = `select umkd_mdl_completion from kpi_scores where userid=${userid};`;
    let [ res ] = await query_f(query_str);
    return res;
  },
  get_role_by_username: async (username) => {
    const query_str = `SELECT role from roles join users on users.id=roles.user_id where users.username = '${username}';`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_iin_by_username: async (username) => {
    const query_str = `SELECT iin from users where username = '${username}';`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0].iin : undefined;
  },
  get_user_id_by_iin: async (inn) => {
    const query_str = `SELECT id from users where iin = '${inn}';`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },

  get_user_roles: async (user_id) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id};`;
    const [ res ] = await query_f(query_str);
    return res;
  },

  // roles - это массив
  get_user_roles_specific: async (user_id, roles) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id} AND role IN ('${roles.join("','")}');`;
    const [ res ] = await query_f(query_str);
    return res;
  },

  get_users_with_role: async (role) => {
    const query_str = `
      SELECT u.id,u.auth_type,u.name,u.lastname,u.middlename,u.username,u.suspended,u.alt_id,u.iin FROM users u
      JOIN roles r ON r.user_id = u.id
      WHERE role = '${role}';
    `;
    const [ res ] = await query_f(query_str);
    return res;
  },

  get_assotiated_id_arr_by_role: async (role) => {
    //SELECT GROUP_CONCAT(assotiated_id) AS str FROM roles WHERE role = '${role}';
    const query_str = `
      SELECT user_id,assotiated_id FROM roles WHERE role = '${role}';
    `;

    //const [ [ { str } ] ] = await query_f(query_str);
    //return str;
    const [ res ] = await query_f(query_str);
    return res;
  },

  delete_user_by_iin: async (iin) =>{
    try {
      let query_str = `select * from users where iin='${iin}';`;
      const [user] = await query_f(query_str);
      query_str = `delete from users where iin='${iin}';`;
      await query_f(query_str);
      query_str = `delete from roles where user_id='${user.id}';`;
      await query_f(query_str);
      query_str = `delete from kpi_scores where userid='${user.id}';`;
      await query_f(query_str);
      return `${user.lastname,' ',user.name} deleted.`;
    }
    catch(err){
      return 'something went wrong: ',err;
    }
  },

  find_user_role: async (user_id, role) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id} AND role = '${role}';`;
    const [ res ] = await query_f(query_str);
    return res[0];
  },
  get_tutors_by_cafedra_id: async (cafedraid) => {
    const query_str = `SELECT ks.userid, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', ks.score from users u
    join kpi_scores ks on u.id = ks.userid
    where ks.cafedra = ${cafedraid} order by ks.score desc;`;
    const [ res ] = await query_f(query_str);
    return res;
  },
  get_total_scores_for_userid: async (userid) => {
    const query_str = `select ROW_NUMBER() over() as counter, kac.category_name as category, sum(ka.primaryscore) as scoresum from files f
    join kpi_activities ka on f.activityid=ka.id
    join kpi_activity_categories kac on ka.categoryid = kac.id
    where f.userid=${userid}
    group by ka.categoryid
    order by ka.categoryid;`;
    let [ res ] = await query_f(query_str);
    return res;
  },
  get_top_ten_tutors_by_score: async (toptentype) => {
    let query_str;
    if (toptentype==0 || toptentype==1){
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid in (0,1)
      order by ks.score desc
      limit 10;`;
    }
    else if (toptentype==2 || toptentype==4){
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid in (2,4)
      order by ks.score desc
      limit 10;`;
    }
    else if (toptentype==3 || toptentype==5){
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid in (3,5)
      order by ks.score desc
      limit 10;`;
    }
    else{
      query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
      join kpi_scores ks on u.id = ks.userid
      join cafedras c on ks.cafedra = c.id
      where academicstatusid=${toptentype}
      order by ks.score desc
      limit 10;`;
    }
    const [ res ] = await query_f(query_str);
    return res;
  },
  get_top_ten_tutors_overall_by_score: async () => {
    const query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score, ks.score_base, ks.score_advanced, ks.kkson_count, ks.scopus_count, ks.wos_count, ks.nirs_count_manager, ks.monograph_count, ks.international_count, ks.nirs_count, ks.tia_count, ks.h_index_scopus, ks.h_index_wos from users u
    join kpi_scores ks on u.id = ks.userid
    join cafedras c on ks.cafedra = c.id
    order by ks.score desc
    limit 10;`;
    const [ res ] = await query_f(query_str);
    return res;
  },
  get_tutor_plt_data: async (user_id) => {
    const query_str = `SELECT * from kpi_scores ks
    where ks.userid=${user_id};`;
    const [ res ] = await query_f(query_str);
    return res;
  },
  get_cafedra_stats: async () => {
    const query_str = `SELECT c.id, c.cafedraNameRU, sum(score) as scoresum, count(*) tutorcount from kpi_scores ks
    join cafedras c on ks.cafedra = c.id
    group by ks.cafedra
    order by scoresum desc;`;
    const [ res ] = await query_f(query_str);
    return res;
  },
  find_cert_record: async (cert_id) => {
    const query_str = `SELECT * FROM cert_records WHERE id = ${cert_id};`;
    const [ res ] = await query_f(query_str);
    return res[0];
  },
  check_upload_eligibility: async (activityid, user_id) =>{
    const query_str = `select * from files f
      join kpi_activities ka on f.activityid = ka.id
      where f.activityid = ${activityid}
      and ka.isunique=1
      and f.userid=${user_id};`
    const [ res ] = await query_f(query_str);
    return res.length === 0;
  },
  get_cert_records_by_user_id: async (user_id) => {
    const query_str = `SELECT * FROM cert_records WHERE user_id = ${user_id};`;
    const [ res ] = await query_f(query_str);
    return res;
  },
  get_file_records_by_user_id: async (user_id) => {
    const query_str = `select f.id, ka.name, f.file_path, f.extradata1, f.filename, f.upload_date, ka.primaryscore from files f
    join kpi_activities ka on f.activityid=ka.id
    where f.userid = ${user_id} 
    order by f.id desc;`;
    const [ res ] = await query_f(query_str);
    return res;
  },
  delete_file_by_filename: async (filename) => {
    const query_str = `delete from files where filename = '${filename}';`;
    const [ res]  = await query_f(query_str);
    return res;
  },

  get_activities_by_category: async (categoryid) => {
    const query_str = `select * from kpi_activities where categoryid=${categoryid};`;
    const [ res ] = await query_f(query_str);
    return res;
  },

  count_kpi_score_by_iin: async (iin) => {
    const query_str = `select ka.primaryscore from files f
    join kpi_activities ka on f.activityid=ka.id
    join users u on f.userid = u.id
    where u.iin = ${iin};`;
    const [ res ] = await query_f(query_str);
    //console.log(res[1].primaryscore);
    let score=0;
    for(let i=0; i<res.length; i++){
      score+=res[i].primaryscore;
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
    and f.upload_date>='${current_year-max_year_gap_base}-09-01 00:00:00';`;
    let [ res ] = await query_f(query_str);
    let score=0;
    for(let i=0; i<res.length; i++){
      score+=res[i].primaryscore;
      //console.log(res[i].primaryscore, '*', res[i].coef,'=',res[i].primaryscore*res[i].coef);
    }
    query_str = `select ka.primaryscore, f.extradata1, kac.coef from files f
    join kpi_activities ka on f.activityid=ka.id
    join kpi_activity_categories kac on ka.categoryid = kac.id
    join users u on f.userid = u.id
    where u.iin = ${iin}
    and ka.id = 26
    and f.upload_date>='${current_year-max_year_gap_base}-09-01 00:00:00';`;
    [ res ] = await query_f(query_str);
    if(res[0]){
      if(res[0].extradata1!=undefined && res[0].extradata1!=null && res[0].extradata1!=''){
        if(res[0].extradata1<=10){
          score+=res[0].primaryscore*parseInt(res[0].extradata1);
        }
        else{
          score+=res[0].primaryscore*10;
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
    and f.upload_date>='${current_year-max_year_gap_advanced}-09-01 00:00:00';`;
    const [ res ] = await query_f(query_str);
    let score=0;
    for(let i=0; i<res.length; i++){
      score+=res[i].primaryscore;
    }
    return score;
  },
  get_faculty_stats: async () =>{
    let query_str = `SELECT sum(score) as scoresum, count(*) tutorcount from kpi_scores ks
    join cafedras c on ks.cafedra = c.id
    where c.facultyNameRU like '%Прикладных%'
    group by ks.cafedra;`;
    let [ res ] = await query_f(query_str);
    let scoreAppliedSciences=0;
    let tutorsAppliedSciences=0;
    for(let i=0; i<res.length; i++){
      scoreAppliedSciences+=parseInt(res[i].scoresum);
      tutorsAppliedSciences+=res[i].tutorcount;
    }
     query_str = `SELECT sum(score) as scoresum, count(*) tutorcount from kpi_scores ks
    join cafedras c on ks.cafedra = c.id
    where c.facultyNameRU like '%Бизнес%'
    group by ks.cafedra;`;
    [ res ] = await query_f(query_str);
    let scoreBusinessAndManagement=0;
    let tutorsBusinessAndManagement=0;
    for(let i=0; i<res.length; i++){
      scoreBusinessAndManagement+=parseInt(res[i].scoresum);
      tutorsBusinessAndManagement+=res[i].tutorcount;
    }
    let data = [{
        id: 1,
        facultyname: 'Факультет прикладных наук',
        scoresum: scoreAppliedSciences,
        tutorcount: tutorsAppliedSciences},
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

    for (const [ key, value ] of Object.entries(data)) {
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