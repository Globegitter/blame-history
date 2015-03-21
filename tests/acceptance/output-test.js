/*global it, describe*/

var { expect } = require('chai');

var nodegitFile = require('../../nodegit');
var fs = require('fs');
var path = require('path');

describe('program output', function () {
  it('has expected output on tests/fixtures/example.txt', async function () {
    try {
      var output = await nodegitFile(['tests/fixtures/example.txt']);
      var outputFile = path.join(__dirname, '..', 'fixtures', 'example-output.txt');
      var exampleOutput = fs.readFileSync(outputFile, { encoding: 'utf-8' });
      //need to make sure this does not have some issues with newlines and whitespaces
      //since comparing program output to expected file
      expect(output.trim()).to.equal(exampleOutput.trim());
    } catch (err){
      expect('everything', err.stack).to.not.be.ok; // eslint-disable-line no-unused-expressions
    }
  });
});
