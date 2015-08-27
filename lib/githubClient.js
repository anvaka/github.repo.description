module.exports = githubClient;
var githubRequest = require('./githubRequest.js');

function githubClient(token) {
  var tokenPart = '';
  if (token) tokenPart = 'access_token=' + token + '&';

  var REPOS = 'https://api.github.com/repositories?per_page=100&' + tokenPart + 'since=';
  var USERS = 'https://api.github.com/users?per_page=100&' + tokenPart + 'since=';
  var USER_DETAILS = 'https://api.github.com/users/';
  var SEARCH_USER_WITH_FOLLOWERS = 'https://api.github.com/search/users?' + tokenPart + 'per_page=100&sort=joined&order=asc&q=';

  return {
    /**
     * gets list of all pub repositories
     */
    getRepositories: getRepositories,

    /**
     * Gets list of all users who joined since given id.
     * See: https://developer.github.com/v3/users/#get-all-users
     */
    getUsers: getUsers,

    /**
     * Gets date when given user has joined.
     */
    getWhenUserJoined: getWhenUserJoined,

    /**
     * Finds users who joined after given date and has at least given number
     * of followers.
     */
    getUsersWhoJoinedAfter: getUsersWhoJoinedAfter,

    /**
     * Gets list of user followers
     */
    getFollowers: getFollowers
  };

  function getFollowers(user) {
    if (typeof user !== 'string') throw new Error('User has to be identified by login');

    var followersArg = createRequestArgs(USER_DETAILS + user + '/followers?per_page=100&' + tokenPart);

    return githubRequest(followersArg, true)
            .then(combineFollowers)
            .catch(handleError);

    function handleError(reason) {
      if (reason.statusCode === 404) {
        console.log('WARNING: User ' + user + ' is not found');
        return [];
      }
      throw reason;
    }
  }

  function combineFollowers(results) {
    var allFollowers = [];
    for (var i = 0; i < results.length; ++i) {
      var items = results[i];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        allFollowers.push(item.login);
      }
    }
    return allFollowers;
  }

  function getUsersWhoJoinedAfter(date, minFollowers) {
    if (typeof minFollowers !== 'number') minFollowers = 3;
    if (typeof date !== 'string') date = '2005-01-01';

    var searchArgs = createRequestArgs(SEARCH_USER_WITH_FOLLOWERS +
      'created:>' + date +
      ' followers:>=' + minFollowers);

    return githubRequest(searchArgs, true).then(combineResults);

    function combineResults(results) {
      var allResults = [];
      for (var i = 0; i < results.length; ++i) {
        var items = results[i].items;
        for (var j = 0; j < items.length; j++) {
          var item = items[j];
          allResults.push(item.login);
        }
      }
      return allResults;
    }
  }

  function getWhenUserJoined(userName) {
    console.log('Loading user\'s join date: ' + userName);
    var detailsRequest = createRequestArgs(USER_DETAILS + userName + '?' + tokenPart);
    return githubRequest(detailsRequest).then(getTime);

    function getTime(user) {
      return user.created_at;
    }
  }

  function getUsers(since) {
    if (typeof since !== 'number') {
      console.log('`since` argument is not present. Assuming 0');
      since = 0;
    }

    var usersRequest = createRequestArgs(USERS + since);
    console.log('Loading users since ' + since);

    return githubRequest(usersRequest);
  }

  function getRepositories(since) {
    if (typeof since !== 'number') {
      console.log('`since` argument is not present. Assuming 0');
      since = 0;
    }

    var repoRequest = createRequestArgs(REPOS + since);
    console.log('Loading repositories since ' + since);

    return githubRequest(repoRequest);
  }
}

function createRequestArgs(uri) {
  return {
    uri: uri,
    resolveWithFullResponse: true,
    headers: {
      'User-Agent': 'anvaka/ghcrawl'
    }
  };
}
