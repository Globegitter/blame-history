'use strict';

var lint = require('mocha-eslint');

var paths = [
  '*.js',
  'tests',
];
var options = {};
options.formatter = 'stylish';

lint(paths, options);
