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

const db = {
  close: async () => {

  },

  find_user_by_username: async (username) => {
    const query_str = `SELECT id,auth_type,name,lastname,middlename,username,password,suspended,alt_id FROM users WHERE username = '${username}';`;
    const [ res ] = await pool.query(query_str);
    return res.length !== 0 ? res[0] : undefined;
  },
};

module.exports = db;