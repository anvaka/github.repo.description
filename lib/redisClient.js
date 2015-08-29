var Redis = require('ioredis');

module.exports = redisClient;

function redisClient() {
  var redis = new Redis();
  redis.defineCommand('getAllHValues', {
    lua: [
      "local result = {}",
      "for i, v in ipairs(KEYS) do",
      // Keys with '_' prefix are reserved, and do not represent hashes:
      "  if string.sub(KEYS[i], 1, 1) ~= '_' then",
      "    local name = redis.call('hgetall', KEYS[i])",
      "    table.insert(name, 'key')",
      "    table.insert(name, KEYS[i])",
      "    result[i] = name",
      "  end",
      "end",
      "return result"
    ].join('\n')
  });

  return {
    /**
     * Close the connection and dispose the client
     */
    close: close,

    /**
     * Set key value into redis
     *
     * @param {string} key where we store value
     * @param {string|number} value that we want to store
     */
    set: set,

    /**
     * Get value at given key
     *
     * @param {string} key to the value.
     * @returns promise that resolves with the value.
     */
    get: get,

    /**
     * Adds all values as hash values for the key
     *
     * @param {string} key
     * @param {array} values - array of values that become values of the hash
     */
    saveToSet: saveToSet,

    /**
     * Removes a random element from a set at given key
     *
     * @param {string} key
     * @returns promise that resolves with the element.
     */
    popFromSet: popFromSet,

    saveToHash: saveToHash,

    saveRepos: saveRepos,

    getHash: getHash,

    forEachKey: forEachKey
  };

  function getHash(key) {
    return redis.hgetall(key);
  }

  function saveToHash(key, properties) {
    return redis.hmset(key, properties);
  }

  function saveToSet(key, values) {
    return redis.sadd(key, values);
  }

  function popFromSet(key) {
    return redis.spop(key);
  }

  function set(key, value) {
    return redis.set(key, value);
  }

  function get(key) {
    return redis.get(key);
  }

  function close() {
    redis.disconnect();
  }

  function forEachKey(callback, done) {

    getChunk(0);

    function getChunk(from) {
      redis.scan(from).then(processChunk);
    }

    function processChunk(chunk) {
      var cursor = parseInt(chunk[0], 10);
      var keys = chunk[1];
      var stopRequest = false;
      // getAllHValues for each key returns an array of attributes e.g.:
      // [
      //   [ 'id', '762', 'key', 'anvaka/VivaGraphJS', ... ],
      //   ...
      // ]
      // Here we are mapping it to array of objects:
      // [ { id: 762, key: 'anvaka/VivaGraphJS'}, .. }
      return redis.getAllHValues(keys.length, keys)
              .then(mapToObjects)
              .then(reportToClient)
              .then(getNextChunk);

      function getNextChunk() {
        if (cursor !== 0 && !stopRequest) getChunk(cursor);
        else done();
      }

      function reportToClient(objects) {
        for (var i = 0; i < objects.length; ++i) {
          stopRequest = (callback(objects[i]) === false);
        }
      }
    }
  }

  function saveRepos(repos) {
    if (!repos || typeof repos.length !== 'number') throw new Error('Invalid repos object: ' + repos);

    var pipeline = redis.pipeline();
    var maxId = 0;
    for (var i = 0; i < repos.length; ++i) {
      var repo = repos[i];
      pipeline.hmset(repo.full_name, {
        id: repo.id,
        fork: repo.fork,
        description: repo.description
      });
      if (repo.id > maxId) maxId = repo.id;
    }

    pipeline.exec(logIfError);

    return maxId;
  }
}

function logIfError(err, results) {
  if (err) {
    console.log('ERROR: ' + err, results);
    throw (err);
  }
}

function mapToObjects(results) {
  return results.map(toObjects);
}

function toObjects(attributesArray) {
  var object = Object.create(null);
  for (var i = 0; i < attributesArray.length; i += 2) {
    object[attributesArray[i]] = attributesArray[i + 1];
  }
  return object;
}
