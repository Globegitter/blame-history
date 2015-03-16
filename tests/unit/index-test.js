/*global it, describe*/

var { assert } = require('chai');

var indexFile = require('../../index');

describe('index file', function () {
  it('works', function () {
    // var result = indexFile();
    try {
      indexFile();
      assert.ok(true);
    } catch (err){
      assert.ok(false, err);
    }
  });
});
