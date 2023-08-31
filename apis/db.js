'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");

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

  find_user_by_username: async (username) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,password,suspended,alt_id FROM users WHERE username = '${username}';`;
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

  find_cert_record: async (cert_id) => {
    const query_str = `SELECT * FROM cert_records WHERE id = ${cert_id};`;
    const [ res ] = await query_f(query_str);
    return res[0];
  },

  get_cert_records_by_user_id: async (user_id) => {
    const query_str = `SELECT * FROM cert_records WHERE user_id = ${user_id};`;
    const [ res ] = await query_f(query_str);
    return res;
  },

  create_row: async (table_name, data) => {
    let insert_columns_str = [];
    let insert_data_str = [];

    for (const [ key, value ] of Object.entries(data)) {
      if (key === "id") continue;
      if (key === "created") continue;
      if (value === undefined) continue;

      let final_value = value;
      if (final_value instanceof Date && !isNaN(final_value)) final_value = format_date(final_value);
      else if (typeof final_value === "object" && typeof final_value.toString === "function") final_value = final_value.toString();
      else if (typeof final_value === "object") final_value = JSON.toString(final_value);

      if (typeof final_value === "string") final_value = `'${mysql_real_escape_string(final_value)}'`;
      if (final_value === null) final_value = `null`;

      insert_columns_str.push(key);
      insert_data_str.push(final_value);
    }

    const insert_str = `INSERT INTO ${table_name} (${insert_columns_str.join(",")}) VALUES (${insert_data_str.join(",")});`;

    return transaction_f(async (con) => {
      await con.query(insert_str);
      return last_insert_id_f(con);
    });

    //return id;
  },
};

module.exports = db;