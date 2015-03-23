var Git = require('nodegit');
var { EOL } = require('os');
var fs = require('fs');
//provides some nicer logs function, such as only showing on the --verbose flag
var logger = require('captains-log');

function getNewRevisionLines(hunkHeader) {
    var start = hunkHeader.indexOf('+') + 1;
    hunkHeader = hunkHeader.slice(start, hunkHeader.length-1);
    var end = hunkHeader.indexOf('@') - 1;
    var content = hunkHeader.slice(0, end);
    var contentSplit = content.split(',');
    return {
        start : parseInt(contentSplit[0]),
        length : parseInt(contentSplit[1])
    };
}

function getOldRevisionLines(hunkHeader) {
    var start = hunkHeader.indexOf('-') + 1;
    var end = hunkHeader.indexOf('+') - 1;
    var content = hunkHeader.slice(start, end);
    var contentSplit = content.split(',');
    return {
        start : parseInt(contentSplit[0]),
        length : parseInt(contentSplit[1]),
    };
}

// Extract info from the hunk header into an object
function interpretHunkHeader(hunkHeader) {
    var oldLines = getOldRevisionLines(hunkHeader);
    var newLines = getNewRevisionLines(hunkHeader);
    return {
        oldRevision: oldLines,
        newRevision: newLines
    };
}

function applyRules(runningBlame, newHunk, commitHash) {
    // delegate the rules according to the hunk header
    var hunkHeader = interpretHunkHeader(newHunk.header());
    // TODO: Look at the difference between - and + from the hunk lines 
    // this would reveal whether it's purely add/remove or a mixture of the two.
    if (hunkHeader.oldRevision.length == hunkHeader.newRevision.length) {
        // Same length, thus a change took place
        var changedLine = changedLineBlame(runningBlame, newHunk, commitHash);
        return changedLine
    } else if (hunkHeader.oldRevision.length < hunkHeader.newRevision.length) {
        return addedLineBlame(runningBlame, newHunk, commitHash);
    }
}

function getLineContentFromLine(line) {
    var content = line.content();
    return content.slice(0, content.indexOf(EOL));
}

function changedLineBlame(runningBlame, newHunk, commitHash) {
    var hunkHeader = interpretHunkHeader(newHunk.header());
    var newIndex = hunkHeader.newRevision.start - 1;
    var counter = 0; // deals with the offset
    for (var line of newHunk.lines()) {
        var origin = String.fromCharCode(line.origin());
        if (origin == '-') {
            // The line being replaced, not sure if we need to do anything
            // No increment
        } else if (origin == '+') {
            // Line needs to be changed
            var indexBlame = runningBlame[newIndex + counter];
            indexBlame.commit.push(commitHash);
            var content = getLineContentFromLine(line);
            var lineBlame = {
                commit: indexBlame.commit,
                line: content
            };
            runningBlame[newIndex + counter] = lineBlame;
            counter++;
        } else {
            counter++;
        }
    }
    return runningBlame;
}

function removedLineBlame(runningBlame, newHunk, commitHash) {
}


function addedLineBlame(runningBlame, newHunk, commitHash) {
    if (runningBlame.length == 0) {
        // If previous blame is empty, i.e. dealing with initial commit
        var newBlame = [];
        for (var line of newHunk.lines()) {
            var content = line.content();
            content = content.slice(0, content.indexOf(EOL));
            var lineBlame = {
                commit: [commitHash],
                line: content
            };
            newBlame.push(lineBlame);
        }
        return newBlame;
    } else {
        // Previous blame is not empty, will need to insert new line to
        // position provided by the hunk header
        var header = interpretHunkHeader(newHunk.header());
        var newIndex = header.newRevision.start - 1;
        var counter = 0;
        var deleteCounter = 0;
        for (var line of newHunk.lines()) {
            var origin = String.fromCharCode(line.origin());
            if (origin == '+') {
                var content = getLineContentFromLine(line);
                if (deleteCounter == 0) {
                    var lineBlame = {
                        commit: [commitHash],
                        line: content
                    }
                    runningBlame.splice(newIndex + counter, 0, lineBlame);
                } else {
                    var indexBlame = runningBlame[newIndex + counter];
                    indexBlame.commit.push(commitHash);
                    var lineBlame = {
                        commit: indexBlame.commit,
                        line: content
                    };
                    runningBlame[newIndex + counter] = lineBlame;
                    deleteCounter--;
                }
                counter++;
            } else if (origin == '-') {
                deleteCounter++;
            } else {
                counter++;
            }
        }
        return runningBlame;
    }
}

//if you pass 'file' it looks for the flag '--file' or '-f'
function parseArg(type) {
  var argVal = null;
  for (var i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === `--${type}` || process.argv[i] === `-${type.slice(0, 1)}`) {
      argVal = process.argv[i + 1];
      break;
    }
  }
  return argVal;
}

//Note: Whenever you use an 'await' in a function, it needs to be async.
//And you always need to put the await keyword before an async function call
//so var firstMasterCommit = await getFirstMasterCommit();
async function getFirstMasterCommit(atPath) {
  atPath = atPath || './';
  try {
    return Git.Repository.open(atPath).then(function (repository) {
      return repository.getMasterCommit();
    });
  } catch (err) {
    throw new Error(err);
  }
}

module.exports = async function (cmdArgs) {
  var fileName = parseArg('file') || cmdArgs[0] || null;
  var atPath = parseArg('path') || './';
  //making it able for tests to set the level of logging at runtime
  var log = logger(cmdArgs[1] || {});
  var runningBlame = [];

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
  //
  function printBlame(blame) {
      for (var lineBlame of blame) {
          console.log(lineBlame.commit.join() + ': ' + lineBlame.line);
      }
  }

  history.on('commit', async function (commit) {

    //Generate an array of diff trees showing changes between this commit and its parent(s).
    //This is essentially the same as 'git diff <parentCommitId> <childCommitId>'
    var diffList = await commit.getDiff();
    var filePath = '';

    for (var diff of diffList) {
      //Retrieve patches (ConvenientPatches in nodegit) in this difflist
      for (var patch of diff.patches()) {
        //not sure why to check oldFile and newFile path, but library example did so.
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

          //getting the hunks (ConvenientHunk) in this patch
          //that is the diff of this file
          for (var hunk of patch.hunks()) {
            log.verbose('displayed hunk/diff size:', hunk.size());
            log.verbose('header', hunk.header().trim());
            runningBlame = applyRules(runningBlame, hunk, commit.sha());
            var count = 1;
            //getting the diff content line-by-line
            for (var line of hunk.lines()) {
              var content = line.content();
              log.verbose(count, String.fromCharCode(line.origin()) + ' ' + content.slice(0, content.indexOf(EOL)));
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

  history.on('end', function (){
    printBlame(runningBlame);
    return null;
  });

  // Don't forget to call `start()`!
  history.start();

  return '';
};
