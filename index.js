var githubClient = require('./lib/githubClient.js')(process.env.GH_TOKEN);
var redisClient = require('./lib/redisClient.js')();
var config = require('./redisNames.js');

redisClient.get(config.LAST_SAVED_ID)
  .then(greetUser)
  .then(indexRepos);

function greetUser(since) {
  console.log('Welcome to the github repositories crawler!');
  if (since) {
    since = parseInt(since, 10);
    console.log('Attemtpting to resume indexing since repository id: ' + since);
  }

  return since;
}

function indexRepos(since) {
  githubClient.getRepositories(since)
    .then(save)
    .then(loadMore)
    .catch(function(e) {
      console.log('Something went bad: ' + e);
      console.log('Quiting...');
      process.exit(-1);
    });
}

function loadMore(ctx) {
  if (ctx.isDone) {
    console.log('All is done.');
    redisClient.close();
    return;
  }
  indexRepos(ctx.lastSavedId);
}

function save(repos) {
  var lastSavedId = redisClient.saveRepos(repos);
  redisClient.set(config.LAST_SAVED_ID, lastSavedId);

  console.log('last saved id: ' + lastSavedId);

  return {
    isDone: repos.length < 100, // this can only happen if we reached the last page
    lastSavedId: lastSavedId
  };
}
