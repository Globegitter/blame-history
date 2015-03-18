'use strict';

var lint = require('mocha-eslint');

var paths = [
  'index.js',
  'nodegit-test.js',
  'tests',
];
var options = {};
options.formatter = 'stylish';

lint(paths, options);
