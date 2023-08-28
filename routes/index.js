const fs = require('fs');

function find_routes_recursive(dirname) {
  let routes = [];
  fs.readdirSync(dirname)
    .filter(file => file != 'index.js')
    .forEach(file => {
      const final_path = `${dirname}/${file}`;
      const stat = fs.lstatSync(final_path);
      if (stat.isDirectory()) {
        routes.concat( find_routes_recursive(final_path) );
        return;
      }

      routes = routes.concat( require(final_path) );
    });

  return routes;
}

const routes = find_routes_recursive(__dirname);
module.exports = routes;