/*********************************************************************************
*  WEB422 – Assignment 3
*
*  I declare that this assignment is my own work in accordance with Seneca's
*  Academic Integrity Policy:
* 
*  https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* 
*  Name: Aaliyah Salat Student ID: 161973185 Date: 01/12/2025
*
*  Vercel App (Deployed) Link: https://web422-a3-app.vercel.app/login
*
********************************************************************************/ 

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const userService = require("./user-service.js");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Middleware 
app.use(express.json());
app.use(cors());

//JWT 
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("JWT"),
  secretOrKey: process.env.JWT_SECRET, 
};

const strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    });
  } else {
    next(null, false);
  }
});

passport.use(strategy);
app.use(passport.initialize());

const auth = passport.authenticate("jwt", { session: false });


// Register a new user
app.post("/api/user/register", (req, res) => {
  userService
    .registerUser(req.body)
    .then((msg) => res.json({ message: msg }))
    .catch((msg) => res.status(422).json({ message: msg }));
});

// Login 
app.post("/api/user/login", (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      const payload = { _id: user._id, userName: user.userName };
      const token = jwt.sign(payload, jwtOptions.secretOrKey, { expiresIn: "1h" });
      res.json({ message: "login successful", token });
    })
    .catch((msg) => res.status(422).json({ message: msg }));
});

// Get favourites
app.get("/api/user/favourites", auth, (req, res) => {
  userService
    .getFavourites(req.user._id)
    .then((data) => res.json(data))
    .catch((msg) => res.status(422).json({ error: msg }));
});

// Add favourite
app.put("/api/user/favourites/:id", auth, (req, res) => {
  userService
    .addFavourite(req.user._id, req.params.id)
    .then((data) => res.json(data))
    .catch((msg) => res.status(422).json({ error: msg }));
});

// Remove Favourite
app.delete("/api/user/favourites/:id", auth, (req, res) => {
  userService
    .removeFavourite(req.user._id, req.params.id)
    .then((data) => res.json(data))
    .catch((msg) => res.status(422).json({ error: msg }));
});


let connected = false;
async function ensureConnect() {
  if (!connected) {
    await userService.connect();
    connected = true;
    console.log("DB connected");
  }
}

if (process.env.VERCEL) {
  module.exports = async (req, res) => {
    try {
      await ensureConnect();
      return app(req, res);
    } catch (err) {
      console.error("Handler error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  };
} else {

  ensureConnect()
    .then(() => {
      app.listen(HTTP_PORT, () => {
        console.log("API listening on: " + HTTP_PORT);
      });
    })
    .catch((err) => {
      console.log("unable to start the server: " + err);
      process.exit(1);
    });
}