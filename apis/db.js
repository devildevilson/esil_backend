'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");
const { get_kpi_score_by_iin } = require("./platonus");
const { parse } = require("dotenv");
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
    let query_str = `select username as 'iin' from users
    join roles on users.id = roles.user_id
    where roles.user_id=${user_id};`;
    let [ iin_res ] = await query_f(query_str);
    let iin=iin_res[0].iin;
    let kpiscore_plt = await plt.get_kpi_score_by_iin(iin);
    let kpiscore_cloud = await db.count_kpi_score_by_iin(iin);
    let kpi_overall = 0;
    kpi_overall = parseInt(kpiscore_plt)+parseInt(kpiscore_cloud);
    console.log(`kpiscore for ${user_id}`,kpi_overall);
    query_str = `SELECT userid from kpi_scores where userid=${user_id};`;
    let [ res ] = await query_f(query_str);
    if(res.length===0){
      const file_data = {
        userid: user_id,
        score: kpi_overall,
      };
      const file = await db.create_row("kpi_scores", file_data);
    }
    else{
      query_str = `update kpi_scores set score=${kpi_overall} where userid=${user_id};`;
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
    const query_str = `SELECT role from roles join users on users.id=roles.user_id where users.username = ${inn};`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
  get_user_id_by_iin: async (inn) => {
    const query_str = `SELECT id from users where username = ${inn};`;
    const [ res ] = await query_f(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },

  get_user_roles: async (user_id) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id};`;
    const [ res ] = await query_f(query_str);
    return res;
  },

  get_user_roles_specific: async (user_id, roles) => {
    const query_str = `SELECT id,user_id,role,assotiated_id,assotiated_str,granted_by,created FROM roles WHERE user_id = ${user_id} AND role IN ('${roles.join("','")}');`;
    const [ res ] = await query_f(query_str);
    return res;
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
    order by ka.categoryid desc;`;
    let [ res ] = await query_f(query_str);
    return res;
  },
  get_top_ten_tutors_by_score: async () => {
    const query_str = `SELECT ks.userid, ROW_NUMBER() over() as counter, CONCAT(u.lastname,' ',u.name, ' ', u.middlename) as 'fio', c.cafedraNameRU, ks.score from users u
    join kpi_scores ks on u.id = ks.userid
    join cafedras c on ks.cafedra = c.id
    order by ks.score desc
    limit 10`;
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
    where u.username = ${iin};`;
    const [ res ] = await query_f(query_str);
    //console.log(res[1].primaryscore);
    let score=0;
    for(let i=0; i<res.length; i++){
      score+=res[i].primaryscore;
    }
    return score;
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