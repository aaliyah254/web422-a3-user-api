const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const mongoDBConnectionString = process.env.MONGO_URL;

const userSchema = new mongoose.Schema({
  userName: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  favourites: { type: [String], default: [] }
});

let User = mongoose.models.users || mongoose.model("users", userSchema);

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  return mongoose.connect(mongoDBConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    tls: true
  });
}

module.exports.connect = connectDB;

module.exports.registerUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      await connectDB();

      if (userData.password !== userData.password2) {
        return reject("Passwords do not match");
      }

      const hash = await bcrypt.hash(userData.password, 10);

      const newUser = new User({
        userName: userData.userName,
        password: hash
      });

      await newUser.save();
      resolve("User " + userData.userName + " successfully registered");

    } catch (err) {
      if (err.code === 11000) {
        reject("User Name already taken");
      } else {
        reject("There was an error creating the user: " + err);
      }
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      await connectDB();

      const user = await User.findOne({ userName: userData.userName }).exec();
      if (!user) return reject("Unable to find user " + userData.userName);

      const match = await bcrypt.compare(userData.password, user.password);
      if (!match) return reject("Incorrect password for user " + userData.userName);

      resolve(user);

    } catch (err) {
      reject("Unable to find user " + userData.userName);
    }
  });
};

module.exports.getFavourites = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      await connectDB();

      const user = await User.findById(id).exec();
      if (!user) return reject(`Unable to get favourites for user with id: ${id}`);

      resolve(user.favourites);

    } catch {
      reject(`Unable to get favourites for user with id: ${id}`);
    }
  });
};

module.exports.addFavourite = function (id, favId) {
  return new Promise(async (resolve, reject) => {
    try {
      await connectDB();

      const user = await User.findById(id).exec();
      if (!user) return reject(`Unable to update favourites for user with id: ${id}`);

      if (user.favourites.length >= 50) {
        return reject(`Unable to update favourites for user with id: ${id}`);
      }

      const updated = await User.findByIdAndUpdate(
        id,
        { $addToSet: { favourites: favId } },
        { new: true }
      ).exec();

      resolve(updated.favourites);

    } catch {
      reject(`Unable to update favourites for user with id: ${id}`);
    }
  });
};

module.exports.removeFavourite = function (id, favId) {
  return new Promise(async (resolve, reject) => {
    try {
      await connectDB();

      const updated = await User.findByIdAndUpdate(
        id,
        { $pull: { favourites: favId } },
        { new: true }
      ).exec();

      if (!updated) return reject(`Unable to update favourites for user with id: ${id}`);

      resolve(updated.favourites);

    } catch {
      reject(`Unable to update favourites for user with id: ${id}`);
    }
  });
};