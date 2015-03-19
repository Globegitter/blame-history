var Git = require('nodegit');
var { EOL } = require('os');

module.exports = async function (cmdArgs) {
  // console.log(process.cwd());
  var fileName = cmdArgs[0];
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
  //var commits = [];

  history.on('commit', async function (commit) {
    var diffList = await commit.getDiff();
    var filePath = '';
    for (var diff of diffList) {
      for (var patch of diff.patches()) {
        //not sure why this check oldFile and newFile path, but the example did that.
        var oldFilePath = patch.oldFile().path();
        var newFilePath = patch.newFile().path();
        if (newFilePath.includes(fileName)) {
          filePath = newFilePath;
        } else if (oldFilePath.includes(fileName)) {
          filePath = oldFilePath;
        }

        //found the file we are looking for
        if (filePath.length > 0) {
          console.log();
          console.log();
          console.log(`Found file in commit ${commit.sha()}`);
          console.log("Author:", commit.author().name() +
         " <" + commit.author().email() + ">");
          console.log("Date:", commit.date());
          console.log("\n    " + commit.message());
          console.log(`Showing file ${filePath}`);
          //geting the file content
          for (var hunk of patch.hunks()) {
            console.log('header', hunk.header().trim());
            console.log('size', hunk.size());
            var count = 1;
            //getting the file line-by-line
            for (var line of hunk.lines()) {
              var content = line.content();
              // console.log('lineOrigin', String.fromCharCode(line.origin()));
              console.log(count, String.fromCharCode(line.origin()) + ' ' + content.slice(0, content.indexOf(EOL)));
              // console.log(count, String.fromCharCode(line.origin()) + ' ' + content);
              count++;
            }
          }
          //found file so break out of for loop
          break;
        }
      }
      //found file in that commit, so break
      if (filePath.length > 0) {
        break;
      }
    }
  });

  // Don't forget to call `start()`!
  history.start();
};
