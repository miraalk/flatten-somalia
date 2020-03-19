const express = require("express");
const app = express();
const port = 3000;
const cors = require("cors");
const bodyParser = require("body-parser");
const basicAuth = require("express-basic-auth");
const cookieParser = require("cookie-parser");
const uuidv4 = require("uuid/v4");
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

    console.log(`Connected MongoDB: ${url}`);
  }
);

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(express.json());

app.post("/submit", (req, res) => {
  const threatScore = flattenMatrix.getScoreFromAnswers(req.body.answers);

  const responseJson = {
    score: threatScore
  };

  if (threatScore) {
    res.status(200).json(responseJson);
  } else {
    res.status(400).send(`Invalid Answer: ${threatScore}`);
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}.`);
});
