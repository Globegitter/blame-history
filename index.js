// var Repo = require('git-tools');
// var repo = new Repo('./');

var repo = require('simple-git')('./');

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
    var revisions = log.all.length;

    repo.diff(`${allLogs[0].hash} ${allLogs[revisions - 1].hash} -- ${options.file}`, (err, diff) => {
      if (err) {
        throw new Error(err);
      }
      console.log(diff);
    });

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
