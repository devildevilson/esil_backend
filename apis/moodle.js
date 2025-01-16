'use strict';

require("dotenv").config();
const mysql = require("mysql2/promise");
const plt = require('@apis/platonus');

const connection_config = {
    host: process.env.MDL_DATABASE_HOST,
    port: process.env.MDL_DATABASE_PORT,
    user: process.env.MDL_DATABASE_USER,
    password: process.env.MDL_DATABASE_PASSWORD,
    database: process.env.MDL_DATABASE_NAME,
    connectionLimit: 10,
    connectTimeout: 100000,
};

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

    get_moodle_tests_data: async (term) => {
        const selectTests = `SELECT 
  (
    SELECT concat(u.lastname, ' ', u.firstname) FROM mdl_user u
    JOIN mdl_role_assignments ra ON ra.userid = u.id
    WHERE ra.contextid = c.id AND ra.roleid = 2 and u.suspended=0
  ) AS "tutor",
  mc.fullname AS "subject", 
  mq.name AS "test", 
  (SELECT COUNT(mqs.id) FROM mdl_quiz_slots mqs 
  WHERE mqs.quizid = mq.id) AS "questioncount"
  FROM mdl_quiz mq
  JOIN mdl_course_modules mcm ON mcm.instance = mq.id 
  JOIN mdl_course mc ON mc.id = mcm.course
  JOIN mdl_context c ON c.instanceid = mc.id AND c.contextlevel = 50
  WHERE mc.idnumber LIKE '%-%-%'
  AND mcm.idnumber LIKE '%-term${term}'
  and mc.fullname not like '%research%' 
  and mc.fullname not like '%практика%'
  and mc.fullname not like '%exam preparation%';`;
        const [res_select_tests] = await query_f(selectTests);

        let reconstructedTestsObj = [];
        for (const res of res_select_tests) {
            if (res.tutor != null) {
                reconstructedTestsObj.push(res);
            }
        }
        const sortedDataTests = reconstructedTestsObj.sort((a, b) => {
            if (a.tutor < b.tutor) return -1;
            if (a.tutor > b.tutor) return 1;
            return 0;
        });
        return sortedDataTests;
    },
    get_moodle_files_data: async (term) => {
        const selectFiles = `SELECT 
        c.fullname AS "subject",
        (
            SELECT DISTINCT concat(u.lastname, ' ', u.firstname)
            FROM mdl_role_assignments ra
            JOIN mdl_user u ON ra.userid = u.id AND u.suspended = 0
            JOIN mdl_context ctx ON ctx.id = ra.contextid
            WHERE ra.roleid = 3
              AND ctx.instanceid = c.id
              AND ctx.contextlevel = 50
              AND u.suspended = 0 
            LIMIT 1
        ) AS "tutor",
        (
            SELECT DISTINCT idnumber
            FROM mdl_role_assignments ra
            JOIN mdl_user u ON ra.userid = u.id AND u.suspended = 0
            JOIN mdl_context ctx ON ctx.id = ra.contextid
            WHERE ra.roleid = 3
              AND ctx.instanceid = c.id
              AND ctx.contextlevel = 50
              AND u.suspended = 0 
            LIMIT 1
        ) AS "tutorid",
        (
            SELECT COUNT(*)
            FROM mdl_course_modules cm
            INNER JOIN mdl_modules m ON cm.module = m.id
            WHERE cm.course = c.id 
              AND (m.name = 'resource' OR m.name = 'lesson')
        ) AS "filecount",
        (
            SELECT COUNT(qs.id)
            FROM mdl_quiz q
            JOIN mdl_quiz_slots qs ON q.id = qs.quizid
            WHERE q.course = c.id
        ) AS "question_count",
        concat('dl.esil.edu.kz/course/view.php?id=', c.id) AS "link"
    FROM 
        mdl_course c
    JOIN 
        mdl_course_categories cc ON cc.id = c.category
    JOIN 
        mdl_course_modules mcm ON mcm.course = c.id
    WHERE 
        c.idnumber LIKE '%-%-%' 
        AND mcm.idnumber = 'exam-term${term}'
        AND c.fullname NOT LIKE '%research%' 
        AND c.fullname NOT LIKE '%производственная%' 
        AND c.fullname NOT LIKE '%өндірістік%'
        AND c.fullname NOT LIKE '%exam preparation%'
    GROUP BY 
        c.id
    ORDER BY 
        cc.name ASC;`;
        const [res_select_files] = await query_f(selectFiles);
        let reconstructedFilesObj = [];
        for (const res of res_select_files) {
            if (res.tutor != null) {
                reconstructedFilesObj.push(res);
            }
        }
        const sortedDataFiles = reconstructedFilesObj.sort((a, b) => {
            if (a.tutor < b.tutor) return -1;
            if (a.tutor > b.tutor) return 1;
            return 0;
        });
        const required_filecount = 18;
        for (const row of sortedDataFiles) {
            console.log(row);
            const cafedra_res = await plt.get_tutor_cafedra_by_tutorid(row.tutorid.substring(1));
            row.cafedra = cafedra_res.cafedra;
            row.percentage = (row.filecount >= 18 && row.question_count > 0)
    ? '100%' 
    : (row.filecount === 0 && row.question_count > 0)
    ? (3 / 21 * 100).toFixed(2) + '%' 
    : ((Math.min(row.filecount, 18) / 21) * 100).toFixed(2) + '%';
        }
        return sortedDataFiles;
    },
    get_moodle_files_data_cafedras: async (term) => {
        const selectFiles = `SELECT 
        c.fullname AS "subject",
        (
            SELECT DISTINCT concat(u.lastname, ' ', u.firstname)
            FROM mdl_role_assignments ra
            JOIN mdl_user u ON ra.userid = u.id AND u.suspended = 0
            JOIN mdl_context ctx ON ctx.id = ra.contextid
            WHERE ra.roleid = 3
              AND ctx.instanceid = c.id
              AND ctx.contextlevel = 50
              AND u.suspended = 0 
            LIMIT 1
        ) AS "tutor",
        (
            SELECT DISTINCT idnumber
            FROM mdl_role_assignments ra
            JOIN mdl_user u ON ra.userid = u.id AND u.suspended = 0
            JOIN mdl_context ctx ON ctx.id = ra.contextid
            WHERE ra.roleid = 3
              AND ctx.instanceid = c.id
              AND ctx.contextlevel = 50
              AND u.suspended = 0 
            LIMIT 1
        ) AS "tutorid",
        (
            SELECT COUNT(*)
            FROM mdl_course_modules cm
            INNER JOIN mdl_modules m ON cm.module = m.id
            WHERE cm.course = c.id 
              AND (m.name = 'resource' OR m.name = 'lesson')
        ) AS "filecount",
        (
            SELECT COUNT(qs.id)
            FROM mdl_quiz q
            JOIN mdl_quiz_slots qs ON q.id = qs.quizid
            WHERE q.course = c.id
        ) AS "question_count",
        concat('dl.esil.edu.kz/course/view.php?id=', c.id) AS "link"
    FROM 
        mdl_course c
    JOIN 
        mdl_course_categories cc ON cc.id = c.category
    JOIN 
        mdl_course_modules mcm ON mcm.course = c.id
    WHERE 
        c.idnumber LIKE '%-%-%' 
        AND mcm.idnumber = 'exam-term${term}'
        AND c.fullname NOT LIKE '%research%' 
        AND c.fullname NOT LIKE '%производственная%' 
        AND c.fullname NOT LIKE '%өндірістік%'
        AND c.fullname NOT LIKE '%exam preparation%'
    GROUP BY 
        c.id
    ORDER BY 
        cc.name ASC;`;
        const [res_select_files] = await query_f(selectFiles);
        let reconstructedFilesObj = [];
        for (const res of res_select_files) {
            if (res.tutor != null) {
                reconstructedFilesObj.push(res);
            }
        }
        const sortedDataFiles = reconstructedFilesObj.sort((a, b) => {
            if (a.tutor < b.tutor) return -1;
            if (a.tutor > b.tutor) return 1;
            return 0;
        });
        const required_filecount = 18;
        let cafedra_results = [];
        for (const row of sortedDataFiles) {
            console.log(row);
            const cafedra_res = await plt.get_tutor_cafedra_by_tutorid(row.tutorid.substring(1));
            row.cafedra = cafedra_res.cafedra;
            row.percentage = (row.filecount >= 18 && row.question_count > 0)
    ? '100' 
    : (row.filecount === 0 && row.question_count > 0)
    ? (3 / 21 * 100).toFixed(2)
    : ((Math.min(row.filecount, 18) / 21) * 100).toFixed(2);
            if(row.cafedra != 'empty') cafedra_results.push({ "cafedra": row.cafedra, "percentage": row.percentage });
        }
        const cafedraStats = {};
        cafedra_results.forEach(({ cafedra, percentage }) => {
            const value = parseFloat(percentage);
            if (!cafedraStats[cafedra]) {
                cafedraStats[cafedra] = { sum: 0, count: 0 };
            }
            cafedraStats[cafedra].sum += value;
            cafedraStats[cafedra].count += 1;
        });
        const averages = {};
        for (const [cafedra, { sum, count }] of Object.entries(cafedraStats)) {
            averages[cafedra] = (sum / count).toFixed(2)+'%';
        }
        return averages;
    },
};

module.exports = db;