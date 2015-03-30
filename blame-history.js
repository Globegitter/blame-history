"use strict";

var _core = require("babel-runtime/core-js")["default"];

var _regeneratorRuntime = require("babel-runtime/regenerator")["default"];

var Git = require("nodegit");

var _require = require("os");

var EOL = _require.EOL;

var path = require("path");
//provides some nicer logs function, such as only showing on the --verbose flag
var logger = require("captains-log");
var gitRoot = "";

function getNewRevisionLines(hunkHeader) {
  var start = hunkHeader.indexOf("+") + 1;
  hunkHeader = hunkHeader.slice(start, hunkHeader.length - 1);
  var end = hunkHeader.indexOf("@") - 1;
  var content = hunkHeader.slice(0, end);
  var contentSplit = content.split(",");
  return {
    start: parseInt(contentSplit[0]),
    length: parseInt(contentSplit[1])
  };
}

function getOldRevisionLines(hunkHeader) {
  var start = hunkHeader.indexOf("-") + 1;
  var end = hunkHeader.indexOf("+") - 1;
  var content = hunkHeader.slice(start, end);
  var contentSplit = content.split(",");
  return {
    start: parseInt(contentSplit[0]),
    length: parseInt(contentSplit[1])
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

// Dealing with the condition where lines
function removedLineBlame(runningBlame, newHunk, commitHash) {
  var hunkHeader = interpretHunkHeader(newHunk.header());
  var newIndex = hunkHeader.newRevision.start - 1;
  var counter = 0;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = _core.$for.getIterator(newHunk.lines()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var line = _step.value;

      var origin = String.fromCharCode(line.origin());
      if (origin === "-") {
        // Remove the elemnt at index
        runningBlame.splice(newIndex + counter, 1);
      } else if (origin === "+") {
        var indexBlame = runningBlame[newIndex + counter];
        var runningCommit = indexBlame.commit.slice();
        runningCommit.push(commitHash);
        var content = getLineContentFromLine(line);
        var lineBlame = {
          commit: runningCommit,
          line: content
        };
        runningBlame.splice(newIndex + counter, 0, lineBlame);
        counter++;
      } else {
        counter++;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"]) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return runningBlame;
}

function applyRules(runningBlame, newHunk, commitHash) {
  // delegate the rules according to the hunk header
  var hunkHeader = interpretHunkHeader(newHunk.header());
  commitHash = commitHash.slice(0, 7);
  // this would reveal whether it's purely add/remove or a mixture of the two.
  if (hunkHeader.oldRevision.length === hunkHeader.newRevision.length) {
    return changedLineBlame(runningBlame, newHunk, commitHash);
  } else if (hunkHeader.oldRevision.length < hunkHeader.newRevision.length) {
    return addedLineBlame(runningBlame, newHunk, commitHash);
  } else {
    return removedLineBlame(runningBlame, newHunk, commitHash);
  }
}

function getLineContentFromLine(line) {
  var content = line.content();
  if (process.platform === "win32") {
    return content.slice(0, content.indexOf("\n"));
  } else {
    return content.slice(0, content.indexOf(EOL));
  }
}

function changedLineBlame(runningBlame, newHunk, commitHash) {
  var hunkHeader = interpretHunkHeader(newHunk.header());
  var newIndex = hunkHeader.newRevision.start - 1;
  var counter = 0; // deals with the offset
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = _core.$for.getIterator(newHunk.lines()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var line = _step.value;

      var origin = String.fromCharCode(line.origin());
      if (origin === "-") {
        // The line being replaced, not sure if we need to do anything
        // No increment
        //console.log("No lines dummy");
        process.stdout.write("");
      } else if (origin === "+") {
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
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"]) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return runningBlame;
}

function addedLineBlame(runningBlame, newHunk, commitHash) {
  if (runningBlame.length === 0) {
    // If previous blame is empty, i.e. dealing with initial commit
    var newBlame = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _core.$for.getIterator(newHunk.lines()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var line = _step.value;

        var content = line.content();
        content = content.slice(0, content.indexOf(EOL));
        var lineBlame = {
          commit: [commitHash],
          line: content
        };
        newBlame.push(lineBlame);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"]) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return newBlame;
  } else {
    // Previous blame is not empty, will need to insert new line to
    // position provided by the hunk header
    var header = interpretHunkHeader(newHunk.header());
    var newIndex = header.newRevision.start - 1;
    var counter = 0;
    var deleteCounter = 0;
    var lineDeleted = false;
    // Quick fix
    var runningCommitSHA = [];
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = _core.$for.getIterator(newHunk.lines()), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        line = _step2.value;

        var origin = String.fromCharCode(line.origin());
        if (origin === "+") {
          content = getLineContentFromLine(line);
          if (deleteCounter === 0) {
            if (lineDeleted) {
              lineBlame = {
                commit: runningCommitSHA,
                line: content
              };
            } else {
              lineBlame = {
                commit: [commitHash],
                line: content
              };
            }
            runningBlame.splice(newIndex + counter, 0, lineBlame);
          } else {
            var indexBlame = runningBlame[newIndex + counter];
            indexBlame.commit.push(commitHash);
            runningCommitSHA = indexBlame.commit;
            lineBlame = {
              commit: indexBlame.commit,
              line: content
            };
            runningBlame[newIndex + counter] = lineBlame;
            deleteCounter--;
          }
          counter++;
        } else if (origin === "-") {
          lineDeleted = true;
          deleteCounter++;
        } else {
          counter++;
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return runningBlame;
  }
}

//if you pass 'file' it looks for the flag '--file' or '-f'
function parseArg(type) {
  var argVal = null;
  if (type === "file" && process.argv.length > 2) {
    //if there is no -- at all in the string or at a point later, within the filename
    if (process.argv[2].indexOf("--") === -1 || process.argv[2].indexOf("--") > 0) {
      return process.argv[2];
    }
  }
  for (var i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === "--" + type || process.argv[i] === "-" + type.slice(0, 1)) {
      argVal = process.argv[i + 1];
      break;
    }
  }
  return argVal;
}

//Note: Whenever you use an 'await' in a function, it needs to be async.
//And you always need to put the await keyword before an async function call
//so var [firstMasterCommit, gitRoot] = await getFirstMasterCommit();
function getFirstMasterCommit(atPath) {
  return _regeneratorRuntime.async(function getFirstMasterCommit$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        atPath = atPath || "./";
        context$1$0.prev = 1;
        return context$1$0.abrupt("return", Git.Repository.openExt(path.dirname(atPath), 0, "").then(function (repository) {
          gitRoot = path.dirname(repository.path());
          return repository.getMasterCommit();
        })["catch"](function (err) {
          throw err;
        }));

      case 5:
        context$1$0.prev = 5;
        context$1$0.t0 = context$1$0["catch"](1);
        throw new Error(context$1$0.t0);

      case 8:
      case "end":
        return context$1$0.stop();
    }
  }, null, this, [[1, 5]]);
}

module.exports = function callee$0$0(cmdArgs) {
  var fileName, atPath, log, runningBlame, err, firstMasterCommit, history, printBlame, promise;
  return _regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        printBlame = function printBlame(blame) {
          //save the print in a string so we can return it.
          var printedBlame = "";
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = _core.$for.getIterator(blame), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var lineBlame = _step.value;

              printedBlame += lineBlame.commit.join() + ": " + lineBlame.line + EOL;
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator["return"]) {
                _iterator["return"]();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          //like console.log but without a trailing newline
          process.stdout.write(printedBlame);
          return printedBlame;
        };

        fileName = parseArg("file") || cmdArgs[0] || null;
        atPath = parseArg("file") || "./";
        log = logger(cmdArgs[1] || {});
        runningBlame = [];

        if (!(typeof fileName === "undefined" || fileName === null || fileName.length === 0)) {
          context$1$0.next = 9;
          break;
        }

        err = new Error("Please provide a valid filename");

        err.name = "NotValidFile";
        throw err;

      case 9:
        context$1$0.next = 11;
        return getFirstMasterCommit(atPath);

      case 11:
        firstMasterCommit = context$1$0.sent;

        fileName = path.relative(gitRoot, fileName).trim();
        if (process.platform === "win32") {
          fileName = fileName.replace(/\\/g, "/");
        }
        console.log(fileName.trim());
        history = firstMasterCommit.history(Git.Revwalk.SORT.REVERSE);

        history.on("commit", function callee$1$0(commit) {
          var diffList, filePath, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, diff, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, patch, oldFilePath, newFilePath, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, hunk, count, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, line, content;

          return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
              case 0:
                context$2$0.next = 2;
                return commit.getDiff();

              case 2:
                diffList = context$2$0.sent;
                filePath = "";
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                context$2$0.prev = 7;
                _iterator = _core.$for.getIterator(diffList);

              case 9:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  context$2$0.next = 99;
                  break;
                }

                diff = _step.value;
                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                context$2$0.prev = 14;
                _iterator2 = _core.$for.getIterator(diff.patches());

              case 16:
                if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                  context$2$0.next = 80;
                  break;
                }

                patch = _step2.value;
                oldFilePath = patch.oldFile().path();
                newFilePath = patch.newFile().path();

                if (newFilePath.includes(fileName)) {
                  filePath = newFilePath;
                } else if (oldFilePath.includes(fileName)) {
                  filePath = oldFilePath;
                }

                if (!(filePath.length > 0)) {
                  context$2$0.next = 77;
                  break;
                }

                log.verbose();
                log.verbose();
                log.verbose("Found file in commit " + commit.sha());
                log.verbose("Author:", commit.author().name() + " <" + commit.author().email() + ">");
                log.verbose("Date:", commit.date());
                log.verbose("\n    " + commit.message());
                log.verbose("Showing hunk/diff for file " + filePath);

                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                context$2$0.prev = 32;
                _iterator3 = _core.$for.getIterator(patch.hunks());

              case 34:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  context$2$0.next = 62;
                  break;
                }

                hunk = _step3.value;

                log.verbose("displayed hunk/diff size:", hunk.size());
                log.verbose("header", hunk.header().trim());
                runningBlame = applyRules(runningBlame, hunk, commit.sha());
                count = 1;
                _iteratorNormalCompletion4 = true;
                _didIteratorError4 = false;
                _iteratorError4 = undefined;
                context$2$0.prev = 43;

                //getting the diff content line-by-line
                for (_iterator4 = _core.$for.getIterator(hunk.lines()); !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                  line = _step4.value;
                  content = line.content();

                  if (process.platform === "win32") {
                    log.verbose(count, String.fromCharCode(line.origin()) + " " + content.slice(0, content.indexOf("\n")));
                  } else {
                    log.verbose(count, String.fromCharCode(line.origin()) + " " + content.slice(0, content.indexOf(EOL)));
                  }
                  count++;
                }
                context$2$0.next = 51;
                break;

              case 47:
                context$2$0.prev = 47;
                context$2$0.t1 = context$2$0["catch"](43);
                _didIteratorError4 = true;
                _iteratorError4 = context$2$0.t1;

              case 51:
                context$2$0.prev = 51;
                context$2$0.prev = 52;

                if (!_iteratorNormalCompletion4 && _iterator4["return"]) {
                  _iterator4["return"]();
                }

              case 54:
                context$2$0.prev = 54;

                if (!_didIteratorError4) {
                  context$2$0.next = 57;
                  break;
                }

                throw _iteratorError4;

              case 57:
                return context$2$0.finish(54);

              case 58:
                return context$2$0.finish(51);

              case 59:
                _iteratorNormalCompletion3 = true;
                context$2$0.next = 34;
                break;

              case 62:
                context$2$0.next = 68;
                break;

              case 64:
                context$2$0.prev = 64;
                context$2$0.t2 = context$2$0["catch"](32);
                _didIteratorError3 = true;
                _iteratorError3 = context$2$0.t2;

              case 68:
                context$2$0.prev = 68;
                context$2$0.prev = 69;

                if (!_iteratorNormalCompletion3 && _iterator3["return"]) {
                  _iterator3["return"]();
                }

              case 71:
                context$2$0.prev = 71;

                if (!_didIteratorError3) {
                  context$2$0.next = 74;
                  break;
                }

                throw _iteratorError3;

              case 74:
                return context$2$0.finish(71);

              case 75:
                return context$2$0.finish(68);

              case 76:
                return context$2$0.abrupt("break", 80);

              case 77:
                _iteratorNormalCompletion2 = true;
                context$2$0.next = 16;
                break;

              case 80:
                context$2$0.next = 86;
                break;

              case 82:
                context$2$0.prev = 82;
                context$2$0.t3 = context$2$0["catch"](14);
                _didIteratorError2 = true;
                _iteratorError2 = context$2$0.t3;

              case 86:
                context$2$0.prev = 86;
                context$2$0.prev = 87;

                if (!_iteratorNormalCompletion2 && _iterator2["return"]) {
                  _iterator2["return"]();
                }

              case 89:
                context$2$0.prev = 89;

                if (!_didIteratorError2) {
                  context$2$0.next = 92;
                  break;
                }

                throw _iteratorError2;

              case 92:
                return context$2$0.finish(89);

              case 93:
                return context$2$0.finish(86);

              case 94:
                if (!(filePath.length > 0)) {
                  context$2$0.next = 96;
                  break;
                }

                return context$2$0.abrupt("break", 99);

              case 96:
                _iteratorNormalCompletion = true;
                context$2$0.next = 9;
                break;

              case 99:
                context$2$0.next = 105;
                break;

              case 101:
                context$2$0.prev = 101;
                context$2$0.t4 = context$2$0["catch"](7);
                _didIteratorError = true;
                _iteratorError = context$2$0.t4;

              case 105:
                context$2$0.prev = 105;
                context$2$0.prev = 106;

                if (!_iteratorNormalCompletion && _iterator["return"]) {
                  _iterator["return"]();
                }

              case 108:
                context$2$0.prev = 108;

                if (!_didIteratorError) {
                  context$2$0.next = 111;
                  break;
                }

                throw _iteratorError;

              case 111:
                return context$2$0.finish(108);

              case 112:
                return context$2$0.finish(105);

              case 113:
              case "end":
                return context$2$0.stop();
            }
          }, null, this, [[7, 101, 105, 113], [14, 82, 86, 94], [32, 64, 68, 76], [43, 47, 51, 59], [52,, 54, 58], [69,, 71, 75], [87,, 89, 93], [106,, 108, 112]]);
        });

        promise = new _core.Promise(function (resolve, reject) {
          history.on("end", function () {
            var printedBlame = printBlame(runningBlame);
            resolve(printedBlame);
          });

          history.on("error", function (error) {
            reject(error);
          });

          // Don't forget to call `start()`!
          history.start();
        });
        return context$1$0.abrupt("return", promise);

      case 19:
      case "end":
        return context$1$0.stop();
    }
  }, null, this);
};

//making it able for tests to set the level of logging at runtime

// Don't think this check is necessary since you could provide a filename from
// a previous revision
// if (!fs.statSync(fileName)) {
//   var err = new Error('Please provide a file that currently exists in your file sysyem.');
//   err.type = 'FileNotFound';
//   throw err;
// }

//var commits = [];
//

//Generate an array of diff trees showing changes between this commit and its parent(s).
//This is essentially the same as 'git diff <parentCommitId> <childCommitId>'

//Retrieve patches (ConvenientPatches in nodegit) in this difflist

//not sure why to check oldFile and newFile path, but library example did so.
//found the file we are looking for
//getting the hunks (ConvenientHunk) in this patch
//that is the diff of this file
//console.log(runningBlame);

//found file so break out of for loop

//found file in that commit, so break
//Promises are needed to return something from within a callback function.
