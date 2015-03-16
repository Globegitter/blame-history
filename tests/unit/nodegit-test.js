/*global it, describe*/

var { assert } = require('chai');

var nodegitFile = require('../../nodegit');

describe('nodegit file', function () {
  it('works', async function () {
    // var result = indexFile();
    try {
      await nodegitFile();
      assert.ok(true);
    } catch (err){
      assert.ok(false, err.stack);
    }
  });
});
