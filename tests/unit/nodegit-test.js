/*global it, describe*/

var { expect } = require('chai');

var nodegitFile = require('../../nodegit');

describe('nodegit file', function () {
  it('works', async function () {
    try {
      await nodegitFile(['tests/fixtures/example.txt', { level: 'verbose' }]);
      expect('everything').to.be.ok; //eslint-disable-line no-unused-expressions
    } catch (err){
      expect('everything', err.stack).to.not.be.ok; //eslint-disable-line no-unused-expressions
    }
  });
});
