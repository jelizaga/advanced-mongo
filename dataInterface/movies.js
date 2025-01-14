const { MongoClient } = require("mongodb");
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const uri =
  "mongodb+srv://jelizaga:" + encodeURIComponent(process.env.MONGODB_PSWD) + "@cluster0.xhlewuy.mongodb.net/?retryWrites=true&w=majority"
const client = new MongoClient(uri);

const databaseName = 'sample_mflix';
const movCollName = 'movies';
const comCollName = 'comments';

module.exports = {}

// https://www.mongodb.com/docs/drivers/node/current/usage-examples/find/
module.exports.getAll = async () => {
  const database = client.db(databaseName);
  const movies = database.collection(movCollName);

  const query = {};
  let movieCursor = await movies.find(query).limit(10).project({title: 1}).sort({runtime: -1});

  return movieCursor.toArray();
}

module.exports.getAllComments = async (movieId) => {
  const database = client.db(databaseName);
  const comments = database.collection(comCollName);
  // https://www.mongodb.com/docs/manual/reference/operator/query-comparison/
  // To get only comments made since 1985:
  // const query = {movie_id: ObjectId(movieId), date: { $gt: new Date("January 1, 1985")}}
  const query = { movie_id: ObjectId(movieId)};
  let commentCursor = await comments.find(query);
  if (!commentCursor) {
    return { error: "Something went wrong. Please try again." };
  } else {
    return commentCursor.toArray();
  }
}

// https://www.mongodb.com/docs/drivers/node/current/usage-examples/findOne/
module.exports.getById = async (movieId) => {
  const database = client.db(databaseName);
  const movies = database.collection(movCollName);
  const query = {_id: ObjectId(movieId)};
  let movie = await movies.findOne(query);
  return movie;
}

module.exports.getCommentById = async (commentId) => {
  const database = client.db(databaseName);
  const comments = database.collection(comCollName);
  const query = { _id: ObjectId(commentId) };
  let result = await comments.findOne(query);
  if (result) {
    return result;
  } else {
    return { error: "Something went wrong. Please try again."}
  }
}

module.exports.getByTitle = async (title) => {
  const database = client.db(databaseName);
  const movies = database.collection(movCollName);
  const query = {title: title};
  let movie = await movies.findOne(query);

  return movie;
}

module.exports.getByIdOrTitle = async (identifier) => {
  let movie;

  if(ObjectId.isValid(identifier)){
    movie = await module.exports.getById(identifier);
  } else {
    movie = await module.exports.getByTitle(identifier);
  }
  if(movie){
    return movie;
  } else {
    return {error: `No item found with identifier ${identifier}.`}
  }
}

// https://www.mongodb.com/docs/v4.4/tutorial/insert-documents/
module.exports.create = async (newObj) => {
  const database = client.db(databaseName);
  const movies = database.collection(movCollName);

  if(!newObj.title){
    // Invalid movie object, shouldn't go in database.
    return {error: "Movies must have a title."}
  }
  const result = await movies.insertOne(newObj);

  if(result.acknowledged){
    return { newObjectId: result.insertedId, message: `Item created! ID: ${result.insertedId}` }
  } else {
    return {error: "Something went wrong. Please try again."}
  }
}

module.exports.createComment = async(movieId, newObj) => {
  const database = client.db(databaseName);
  const comments = database.collection(comCollName);
  const movieExists = await module.exports.getById(movieId);
  if (movieExists) {
    const goodObj = {...newObj, movie_id: ObjectId(movieId), date: new Date()};
    const result = await comments.insertOne(goodObj);
    if(result.acknowledged){
      return { newObjectId: result.insertedId, message: `Comment created! ID: ${result.insertedId}` }
    } else {
      return {error: "Something went wrong. Please try again."}
    }
  } else {
    return {error: `No item found with identifier ${movieId}.`}
  }
}

// https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/write-operations/change-a-document/
module.exports.updateById = async (movieId, newObj) => {
  const database = client.db(databaseName);
  const movies = database.collection(movCollName);

  // Product team says only these two fields can be updated.
  const updateRules = {
    $set: {"title" : newObj.title, "plot": newObj.plot}
  };
  const filter = { _id: ObjectId(movieId) };
  const result = await movies.updateOne(filter, updateRules);

  if(result.modifiedCount != 1){
    return {error: `Something went wrong. ${result.modifiedCount} movies were updated. Please try again.`}
  };

  const updatedMovie = module.exports.getById(movieId);
  return updatedMovie;
}

module.exports.updateCommentById = async (commentId, newObj) => {
  const database = client.db(databaseName);
  const comments = database.collection(comCollName);

  const updateRules = {
    $set: { "text": newObj.text }
  };
  
  const filter = { _id: ObjectId(commentId) };
  const result = await comments.updateOne(filter, updateRules);

  if(result.modifiedCount != 1) {
    return { error: `Something went wrong. ${result.modifiedCount} comments were updated. Please try again.` };
  };

  const updatedComment = await module.exports.getCommentById(commentId);
  return updatedComment;
}

// https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/write-operations/delete/
module.exports.deleteById = async (movieId) => {
  const database = client.db(databaseName);
  const movies = database.collection(movCollName);

  const deletionRules = {_id:ObjectId(movieId)}
  const result = await movies.deleteOne(deletionRules);

  if(result.deletedCount != 1){
    return {error: `Something went wrong. ${result.deletedCount} movies were deleted. Please try again.`}
  };

  return {message: `Deleted ${result.deletedCount} movie.`};
}

module.exports.deleteCommentById = async (commentId) =>{
  const database = client.db(databaseName);
  const comments = database.collection(comCollName);

  const deletionRules = { _id:ObjectId(commentId) };
  const result = await comments.deleteOne(deletionRules);

  if (result.deletedCount != 1){
    return { error: `Something went wrong. ${result.deletedCount} movies were deleted. Please try again.`};
  }

  return { message: `Deleted ${result.deletedCount} comment.`};
}