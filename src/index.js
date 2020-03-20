const express = require("express");
const app = express();
const port = process.env.PORT || 80;
const cors = require("cors");
const bodyParser = require("body-parser");
const basicAuth = require("express-basic-auth");
const cookieParser = require("cookie-parser");
const uuidv4 = require("uuid/v4");
const requestIp = require("request-ip");
const MongoClient = require("mongodb").MongoClient;

const flattenMatrix = require("./flattenMatrix/matrix.js");

require("dotenv").config();

const cloud = process.env.CLOUDDB;

const url = cloud
  ? `mongodb+srv://admin:${process.env.DBPASSWORD}@covid-19-09okh.mongodb.net/test?retryWrites=true&w=majority`
  : "mongodb://127.0.0.1:27017";

var db, collection, users;

const dbName = "covid-19";

MongoClient.connect(
  url,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.log(err);

    db = client.db(dbName);
    patients = db.collection("patients");

    console.log(`Connected MongoDB: ${url}`);
  }
);

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(express.json());

// submit endpoint
app.post("/submit", (req, res) => {
  const threatScore = flattenMatrix.getScoreFromAnswers(req.body);

  if (threatScore) {
    const matrixResponse = flattenMatrix.getResponseFromScore(threatScore);
    const responseJson = {
      score: threatScore,
      response: matrixResponse
    };

    res.status(200).json(responseJson);
  } else {
    throw new Error("Invalid Response");
  }
});

// uid generator
app.use(cookieParser(uuidv4()));

// creates a cookie and saves IP address into DB
app.get("/", (req, res) => {
  // get client ip address
  let clientIp = {
    clientIp: requestIp.getClientIp(req)
  };

  console.log(clientIp["clientIp"]);

  // set signed cookie configurations
  const options = {
    httpOnly: true,
    signed: true
  };

  res.cookie("userCookieValue", uuidv4(), options);

  // insert ip into db
  patients.insertOne(clientIp, function(err, res) {
    if (err) {
      res.status(400).json(err);
    }
    console.log("Patient IP inserted!");
  });

  res.send("success");
});

// determines if a cookie already exists
app.get("/read-cookie", (req, res) => {
  let exists;
  req.signedCookies.userCookieValue ? (exists = true) : (exists = false);
  res.send({ exists: exists });
});

//clears cookie
app.get("/clear-cookie", (req, res) => {
  res.clearCookie("userCookieValue").send("success");
});

app.listen(port, () => {
  console.log(`listening on port ${port}.`);
});
