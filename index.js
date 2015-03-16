var Repo = require('git-tools');
var repo = new Repo('./');

module.exports = function () {
  repo.authors(function (error, authors) {
    console.log(authors);
  });
};
