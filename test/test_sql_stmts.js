const fs = require('fs');
const assert = require('assert');
const spatiasql = require('../dist/spatiasql-node');

spatiasql.then(Database => {

  try {
    test(Database);
  } catch (err) {
    console.log(err);
  }

});

function test(Database) {

  var db_name = '';
  var noFailed = 0;
  var noCases = 0;
  var caseFailed = [];

  var db;

  var testcases = fs.readdirSync('test/sql_stmt_tests');
  for (var i = 0, is = testcases.length; i < is; i++) {

    if (testcases[i].indexOf('.testcase') < 0 || !fs.lstatSync('test/sql_stmt_tests/' + testcases[i]).isFile())
      continue;
    var testcase = fs.readFileSync('test/sql_stmt_tests/' + testcases[i], { encoding: 'utf-8' });
    if (testcase.length > 0) {
      noCases++;

      var lines = testcase.split('\n');
      var title = lines[0];
      var db_name_pre = db_name;
      db_name = lines[1].substr(0, (lines[1].indexOf('#') < 0 ? lines[1].length : lines[1].indexOf('#'))).trim();

      if (db_name.indexOf(':memory:') === 0) {
        if (db_name_pre != ':memory:') {
          var db = new Database();
          db.exec("SELECT InitSpatialMetaData(1)");
        }
      } else if (db_name.indexOf('NEW:memory:') > -1) {
        if (db) {
          db.close();
        }
        db = new Database();
      } else {
        if (db) {
          db.close();
        }
        db = new Database(fs.readFileSync('test/' + db_name));
      }

      var stmt = lines[2];
      var rows = parseInt(lines[3].split(' ')[0]);
      var cols = parseInt(lines[4].split(' ')[0]);
      var expect = lines.slice(5 + cols);
      var res = db.exec(stmt);
      console.log(i + ' ' + title);
      // console.log('testcase: ' + title);
      // console.log('db: ' + db_name);
      // console.log(res[0].values[0]);

      for (var r = 0; r < res[0].values.length; r++) {
        for (var c = 0; c < res[0].values[r].length; c++) {
          var idx = r * cols + c;
          let lenTocompare = -1;

          if (expect[idx].trim() === '(NULL)')
            expect[idx] = 'null';
          else // remove comments (#)
            expect[idx] = expect[idx].substr(0, (expect[idx].indexOf('#') < 0 ? expect[idx].length : expect[idx].indexOf('#'))).trim();

          let expected = expect[idx];
          let found = res[0].values[r][c] !== null ? res[0].values[r][c].toString() : 'null';
          if (expected.match(/:\d+$/)) {
              lenTocompare = parseInt(expected.substring(expected.lastIndexOf(':') + 1));
              expected = expected.substr(0, lenTocompare);
              found = found.substr(0, lenTocompare);
          }

          try {
            assert.ok(found === expected ||
              (!isNaN(parseFloat(found)) && (parseFloat(found).toFixed(4) === parseFloat(expected).toFixed(4))), title);
          } catch (err) {
            console.log('\n\nfile: ' + testcases[i]);
            console.log('expected:\n ' + expected + ' ' + expect[idx]);
            console.log('found:\n ' + found + ' ' +  res[0].values[r][c]);
            console.log('lenTocompare:\n ' + lenTocompare);
            if (caseFailed.indexOf(testcases[i]) < 0) {
              noFailed++;
              caseFailed.push(testcases[i])
            }
          }

        }
      }
    }
  }

  console.log('\n' + noFailed + ' of ' + noCases + ' tests failed\n\nFailed tests:\n' + caseFailed.join('\n'));

  process.exit(noFailed ? 1 : 0);

}



