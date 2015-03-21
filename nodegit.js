var Git = require('nodegit');
var { EOL } = require('os');
var fs = require('fs');

var printUtils = {
    printCommit: function(commit) {
        console.log();
        console.log();
        console.log(`Found file in commit ${commit.sha()}`);
        console.log("Author:", commit.author().name() +
            " <" + commit.author().email() + ">");
        console.log("Date:", commit.date());
        console.log("\n    " + commit.message());
    },
}

module.exports = async function (cmdArgs) {
  // console.log(process.argv);
  var fileName = cmdArgs[0];
  for (var i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === '--file' || process.argv[i] === '-f') {
      fileName = process.argv[i + 1];
      break;
    }
  }

  if (typeof fileName === 'undefined' || fileName === null || fileName.length === 0) {
    var err = new Error('Please provide a valid filename');
    err.name = 'NotValidFile';
    throw err;
  }

  // Don't think this check is necessary since you could provide a filename from
  // a previous revision
  // if (!fs.statSync(fileName)) {
  //   var err = new Error('Please provide a file that currently exists in your file sysyem.');
  //   err.type = 'FileNotFound';
  //   throw err;
  // }

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
            printUtils.printCommit(commit);
         console.log(`Showing hunk/diff for file ${filePath}`);
          //geting the file content
          for (var hunk of patch.hunks()) {
            console.log('displayed hunk/diff size:', hunk.size());
            console.log('header', hunk.header().trim());
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
