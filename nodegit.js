var Git = require('nodegit');
var { EOL } = require('os');
var fs = require('fs');
//provides some nicer logs function, such as only showing on the --verbose flag
var logger = require('captains-log');

function parseFileArg() {
  var fileName = null;
  for (var i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === '--file' || process.argv[i] === '-f') {
      fileName = process.argv[i + 1];
      break;
    }
  }
  return fileName;
}

//Note: Whenever you use an 'await' in a function, it needs to be async.
//And you always need to put the await keyword before an async function call
//so var
async function getFirstMasterCommit(atPath) {
  atPath = atPath || './';
  try {
    return firstMasterCommit = await Git.Repository.open(atPath).then(function (repository) {
      return repository.getMasterCommit();
    });
  } catch (err) {
    throw new Error(err);
  }
}

module.exports = async function (cmdArgs) {
  var fileName = parseFileArg() || cmdArgs[0] || null;
  //making it able for tests to set the level of logging at runtime
  var log = logger(cmdArgs[1] || {});
  var atPath = './';

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

  var firstMasterCommit = await getFirstMasterCommit(atPath);
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
          log.verbose();
          log.verbose();
          log.verbose(`Found file in commit ${commit.sha()}`);
          log.verbose("Author:", commit.author().name() +
         " <" + commit.author().email() + ">");
          log.verbose("Date:", commit.date());
          log.verbose("\n    " + commit.message());
          log.verbose(`Showing hunk/diff for file ${filePath}`);
          //geting the file content
          for (var hunk of patch.hunks()) {
            log.verbose('displayed hunk/diff size:', hunk.size());
            log.verbose('header', hunk.header().trim());
            var count = 1;
            //getting the file line-by-line
            for (var line of hunk.lines()) {
              var content = line.content();
              // log.verbose('lineOrigin', String.fromCharCode(line.origin()));
              log.verbose(count, String.fromCharCode(line.origin()) + ' ' + content.slice(0, content.indexOf(EOL)));
              // log.verbose(count, String.fromCharCode(line.origin()) + ' ' + content);
              count++;
            }
          }
          //found file so break out of for loop
          break;
        }
      }
      //found file in that commit, so break
      if (filePath.length > 0) {
        log.verbose('Breaking out of the for loop!' + commit.sha());
        break;
      }
    }
  });

  history.on('end', function (){
    //TODO: needs to resolve the promise here for the tests and return the final output
    return null;
  });

  // Don't forget to call `start()`!
  history.start();

  return '';
};
