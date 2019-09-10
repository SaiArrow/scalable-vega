import * as vega from "vega";
import VegaTransformPostgres from "vega-transform-pg";
const querystring = require('querystring');
const http = require('http');

const postgresConnectionString = 'postgres://localhost:5432/voyager';

function run(spec:vega.Spec) {
  VegaTransformPostgres.setPostgresConnectionString('postgres://localhost:5432/voyager');
  VegaTransformPostgres.setHttpOptions({
    hostname: 'localhost',
    port: 3000,
    method: 'POST',
    path: '/query',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  (vega as any).transforms["postgres"] = VegaTransformPostgres;
  const runtime = vega.parse(spec);
  const view = new vega.View(runtime)
    .logLevel(vega.Info)
    .renderer("svg")
    .initialize(document.querySelector("#view"));
  window["vega"] = vega;
  window["view"] = view;
  view.runAsync();
}

function handleVegaSpec() {
  const reader = new FileReader();
  reader.onload = function(e:any) {
    const spec = JSON.parse(e.target.result);
    run(spec);
  };
  reader.readAsText(this.files[0]);
  (<HTMLInputElement>document.getElementById("vega-spec")).value = "";
}

function handleData() {
  const reader = new FileReader();
  let filename;
  reader.onload = function(e:any) {
    if(filename.slice(filename.length-'.json'.length) != '.json') {
      throw `file ${filename} must have .json extension`;
    }
    const tableName = filename.slice(0,(filename.length-'.json.'.length)+1);
    const data = JSON.parse(e.target.result);
    const postData = querystring.stringify({
      name: tableName,
      data: JSON.stringify(data),
      postgresConnectionString: postgresConnectionString
    });
    const httpOptions = {
      hostname: 'localhost',
      port: 3000,
      method: 'POST',
      path: '/createSql',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'Content-Length': Buffer.byteLength(postData)
    };
    const req = http.request(httpOptions, res => {
      let result = '';
      res.on('data', chunk => {
        result += chunk;
      });
      res.on('end', () => {
        if(res.statusCode === 400) {
          throw `${res.statusMessage}: ${result}`;
        }
      });
    });
    req.write(postData);
    req.end();
  }
  filename = this.files[0].name;
  reader.readAsText(this.files[0]);
  (<HTMLInputElement>document.getElementById("data")).value = "";
}

document.getElementById("vega-spec").addEventListener("change", handleVegaSpec, false);
document.getElementById("data").addEventListener("change", handleData, false);
