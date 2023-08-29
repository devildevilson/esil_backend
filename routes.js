require('module-alias/register');
const fs = require('fs');
const path = require('path');

function make_routes(routes, path, name) {
  if (Array.isArray(routes)) {
    for (let route of routes) {
      if (!route.path || route.path === "") {
        route.path = `${path}/${name}`;
      } else {
        route.path = `${path}${route.path}`;
      }
    }

    return routes;
  } else {
    let route = routes;
    if (!route.path || route.path === "") {
      route.path = `${path}/${name}`;
    } else {
      route.path = `${path}${route.path}`;
    }

    return [ route ];
  }
}

function find_routes_recursive(dirname, cur_link = "") {
  let routes = [];
  fs.readdirSync(dirname)
    //.filter(file => file !== 'index.js')
    .forEach(file => {
      const file_name = path.parse(file).name;
      const final_path = `${dirname}/${file}`;
      const stat = fs.lstatSync(final_path);
      if (stat.isDirectory()) {
        routes = routes.concat( find_routes_recursive(final_path, `${cur_link}/${file}`) );
        return;
      }

      const local_routes = require(final_path);
      const prepared_routes = make_routes(local_routes, cur_link, file_name);
      routes = routes.concat(prepared_routes);
    });

  return routes;
}

//const routes = find_routes_recursive(__dirname);
module.exports = find_routes_recursive;