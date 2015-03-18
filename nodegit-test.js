var Git = require('nodegit');

module.exports = async function () {
  // console.log(process.cwd());
  var firstMasterCommit;
  try {
    firstMasterCommit = await Git.Repository.open('./').then(function (repository) {
      return repository.getMasterCommit();
    });
  } catch (err) {
    throw new Error(err);
  }

  // console.log('firstMasterCommit', firstMasterCommit);
  var history = firstMasterCommit.history(Git.Revwalk.SORT.REVERSE);
  // var commits = [];
  // console.log(history);
  // History emits "commit" event for each commit in the branch's history
  // history.on("commit", function(commit) {
  //   // console.log('on commit');
  //   return commit.getDiff()
  //   .then(function(diffList) {
  //     // console.log(diffList);
  //     var addCommit = diffList.reduce(function(prevVal, diff) {
  //       // console.log('prevVal', prevVal);
  //       // console.log('diff', diff);
  //       var result =
  //       prevVal ||
  //       diff.patches().reduce(function(prevValDiff, patch) {
  //         // console.log('diff.patches()', prevValDiff);
  //         // console.log('patch', patch);
  //         // console.log('patch oldFile', patch.oldFile().path());
  //         // console.log('patch newFile', patch.newFile().path());
  //         var result =
  //         prevValDiff ||
  //         !!~patch.oldFile().path().indexOf("descriptor.json") ||
  //         !!~patch.newFile().path().indexOf("descriptor.json");
  //
  //         return result;
  //       }, false);
  //       // console.log('add comit', result);
  //       return result;
  //     }, false);
  //
  //     //if (addCommit) {
  //       commits.push(commit);
  //     //}
  //   });
  // });
  //
  // history.on("end", function() {
  //   commits.forEach(function(commit) {
  //     console.log("commit " + commit.sha());
  //     console.log("Author:", commit.author().name() +
  //     " <" + commit.author().email() + ">");
  //     console.log("Date:", commit.date());
  //     console.log("\n    " + commit.message());
  //   });
  // });
  history.on('commit', async function (commit) {
    console.log();
    console.log();
    console.log('Date:', commit.date());
    console.log(commit.message());
    var diffList = await commit.getDiff();
    // console.log(diffList);
    diffList.map(function (diff) {
      diff.patches().map(function (patch) {
        console.log('oldFile', patch.oldFile().path());
        console.log('newFile', patch.newFile().path());
      });
    });
    // console.log('commit ' + commit.sha());
    // console.log('Author:', commit.author().name() +
    // ' <' + commit.author().email() + '>');
    // console.log('Date:', commit.date());
    // console.log('\n    ' + commit.message());
  });

  // Don't forget to call `start()`!
  history.start();
};
