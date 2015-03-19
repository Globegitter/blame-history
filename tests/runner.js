'use strict';

var glob = require('glob');
var Mocha = require('mocha');


require('babel/register')({
  experimental: true,
  loose: true
});

var mocha = new Mocha({
  // For some reason, tests take a long time on Windows (or at least AppVeyor)
  timeout: (process.platform === 'win32') ? 30000 : 18000,
  reporter: 'spec'
});

// Determine which tests to run based on argument passed to runner
var arg = process.argv[2];
if (!arg) {
  var root = 'tests/{unit,acceptance,lint}';
} else if (arg === 'lint') {
  var root = 'tests/lint';
} else {
  var root = 'tests/{unit,acceptance}';
}

function addFiles(mocha, files) {
  glob.sync(root + files).forEach(mocha.addFile.bind(mocha));
}

addFiles(mocha, '/**/*-test.js');

mocha.run(function (failures) {
  process.on('exit', function () {
    process.exit(failures); //eslint-disable-line no-process-exit
  });
});
