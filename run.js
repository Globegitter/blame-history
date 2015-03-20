require('babel/register')({
  experimental: true,
  loose: true
});

var nodegitFile = require('./nodegit');

nodegitFile(['tests/fixtures/example.txt']);
