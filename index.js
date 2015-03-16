// var Repo = require('git-tools');
// var repo = new Repo('./');

var repo = require('simple-git')('./');
var JsDiff = require('diff');
// var fs = require('fs');

module.exports = function () {

  // repo.authors(function (error, authors) {
  //   console.log(authors);
  // });
  var options = { file: 'index.js' };
  repo.log(options, (err, log) => {
    if (err) {
      throw new Error(err);
    }

    var allLogs = log.all.reverse();
    // var revisions = log.all.length;
    repo.show(`${allLogs[0].hash} ${options.file}`, function (err, show1) {
      if (err) {
        throw new Error(err);
      }
      // console.log('!!!!');
      // console.log('show1', show1);

      repo.show(`${allLogs[1].hash} ${options.file}`, function (err, show2) {
        if (err) {
          throw new Error(err);
        }

        console.log('creating patch');
        var patch = JsDiff.createPatch('index.js', show1, show2);
        console.log(patch);
      });
    });

    // repo.diff(`${allLogs[0].hash} ${allLogs[1].hash} -- ${options.file}`, (err, diff) => {
    //   if (err) {
    //     throw new Error(err);
    //   }
    //   console.log(diff);
    // });

    // allLogs.reverse().map( (log, i) => {
    //   if (i < allLogs.length - 1 ) {
    //     repo.diff(`${log.hash} ${allLogs[i + 1].hash} -- ${options.file}`, (err, diff) => {
    //       if (err) {
    //         throw new Error(err);
    //       }
    //       console.log(diff);
    //     });
    //   }
    // });

  });
};
