const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "";

module.exports = [
  {
    method: 'GET',
    path: '/generate/cloud',
    handler: async function (request, reply) {
        const cloud_data = await db.get_dashboard_data();
        return cloud_data;
    },
  },
  {
    method: 'GET',
    path: '/generate/platonus',
    handler: async function (request, reply) {
        const plt_data = await plt.generate_dashboard_data();
        return plt_data;
    },
  },
];