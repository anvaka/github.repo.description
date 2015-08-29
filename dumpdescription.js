var redisClient = require('./lib/redisClient.js')();
var descriptions = [];

redisClient.forEachKey(function(object) {
  if (object.fork === 'false' && // type coercion from redis.
      object.description &&
      object.description.length > 13 &&
      object.description.length < 320) {
    descriptions.push(object.description);
  }
  if (descriptions.length > 1000) {
    return false;
  }
}, function () {
  redisClient.close();
  descriptions.sort();
  console.log(JSON.stringify(descriptions, null, 2));
});
