require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const requestIp = require("request-ip");
const axios = require("axios");
const helmet = require("helmet");
const flattenMatrix = require("./flattenMatrix/matrix.js");
const googleData = require("./dataStore");
const crypto = require("crypto");
const port = process.env.PORT || 80;
const app = express();

const hashingIterations = 100000;
const CLIENT_ID = process.env.CLIENT_ID;

// ONLY FOR DEBUG, UNCOMMENT WHEN MERGED
// app.use(cors({ origin: true, credentials: true }));
app.use(cors({ origin: `https://${process.env.DOMAIN}`, credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(express.json());

app.use(helmet());
app.use(helmet.permittedCrossDomainPolicies());

// Setting a uuid here instead of calling uuidv4() function, so that decoding value doesn't change everytime app restarts
app.use(cookieParser("a2285a99-34f3-459d-9ea7-f5171eed3aba"));

// submit endpoint
app.post("/submit", async (req, res) => {
  const SECRET_KEY = "6LfuVOIUAAAAAFWii1XMYDcGVjeXUrahVaHMxz26";

  const recaptchaResponse = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${req.body.reactVerification}`
  );

  if (!recaptchaResponse.data.success) {
    res.status(400).send("Sorry, your recaptcha was invalid.");
    return;
  }

  const form_response_fields = [
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "postalCode"
  ];
  const form_responses = form_response_fields.reduce(
    (obj, field) => ({
      ...obj,
      [field]: req.body[field]
    }),
    {}
  );

  const timestamp = Date.now();
  const submission = {
    timestamp,
    ip_address: requestIp.getClientIp(req),
    at_risk: flattenMatrix.atRisk(req.body),
    probable: flattenMatrix.probable(req.body),
    form_responses: {
      ...form_responses,
      timestamp
    }
  };

  //Google Sign-In Token Verification
  //Add google token field to req body
  const client = new OAuth2Client(CLIENT_ID);
  let userID = null;
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    userID = payload["sub"]; //sub is the user's unique google ID
  }

  verify().catch(err => {
    res.status(400).send(`Google IDToken verification failed`);
  });
  console.log(`Google UserID: ${userID}`);

  //Used to create a hash
  crypto.pbkdf2(
    userID, //Thing to hash
    process.env.PEPPER, //128bit Pepper
    hashingIterations, //Num of iterations (recomended is aprox 100k)
    64, //Key length
    "sha512", // HMAC Digest Algorithm
    async (err, derivedKey) => {
      if (err) {
        res.status(400).send(`Hashing error: ${err}`);
      }
      const hashedUserID = derivedKey.toString("hex");
      try {
        await googleData.insertForm(submission, hashedUserID);
      } catch (e) {
        res
          .status(400)
          .send(
            "Sorry, an error occured with your form submission. Please refresh the page and try again."
          );
        return;
      }
      res.status(200).send(true);
    }
  );
});

app.post("/login", async (req, res) => {
  //Include google token field and cookies to req body
  //Google Sign-In Token Verification
  const client = new OAuth2Client(CLIENT_ID);
  let userID = null;
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    userID = payload["sub"]; //sub is the user's unique google ID
  }
  verify().catch(() => {
    res.status(400).send("Token not valid, login failed");
    return;
  });
  console.log(`Google UserID: ${userID}`);
  //End Token Verification

  //If cookie exists there may be a form associated w it
  const cookie_id = req.signedCookies.userCookieValue;

  //Need to associate it w the googleUserID instead and delete the old one
  if (cookie_id) {
    crypto.pbkdf2(
      userID, // Thing to hash
      process.env.PEPPER, // 128bit Pepper
      hashingIterations, // Num of iterations (recomended is aprox 100k)
      64, // Key length
      "sha512", // HMAC Digest Algorithm
      async (err, derivedKey) => {
        if (err) {
          res.status(400).send(`Hashing error: ${err}`);
        }
        console.log(derivedKey.toString("hex"));
        await googleData.migrateCookieForm(
          derivedKey.toString("hex"),
          cookie_id
        );
      }
    );
  }
  const data = { loginSuccess: true };
  res.status(200).json(data);
});

// determines if a cookie already exists
app.get("/read-cookie", (req, res) => {
  console.log(req.signedCookies.userCookieValue);
  const exists = req.signedCookies.userCookieValue ? true : false;
  res.send({ exists });
});

// clears cookie
app.delete("/clear-cookie", (req, res) => {
  res.clearCookie("userCookieValue").send("success");
});

app.get("/", (req, res) => {
  res.status(200).send(`COVID-19 ${process.env.BACKEND_BRANCH} BACKEND ONLINE`);
});

app.listen(port, () => {
  console.log(`listening on port ${port}.`);
});
