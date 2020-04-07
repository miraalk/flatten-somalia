const express = require("express");
const requestIp = require("request-ip");
const { v4: uuidv4 } = require("uuid");
const {URL} = require("url");

const router = express.Router();

const secrets = require("./utils/secrets");
const googleData = require("./datastore/accounts");
const cookies = require("./models/cookie");
const verification = require("./utils/verification");
const sg = require("./utils/sendgrid");

var recaptcha_secret = new secrets.Recaptcha();

const verify_path = "/verify";

// submit endpoint
router.post("/submit", async (req, res) => {
  [
    recaptchaSuccess,
    recaptchaFailMessage,
  ] = await recaptcha_secret.verifyRecaptcha(req.body.reactVerification);
  if (!recaptchaSuccess) {
    res.status(400).send(recaptchaFailMessage);
    return;
  }

  const ip = requestIp.getClientIp(req);
  const email = req.body.form_responses.email;
  delete req.body.form_responses.email;

  let userCookie = cookies.handleSubmit(req.signedCookies.userCookieValue, email);

  let token_id = undefined;
  let token_expires = undefined;
  if (userCookie.value.status === "e" && !(email===undefined)) {
    let token;
    [token, token_id, token_expires] = await verification.generateToken(email);

    let verify_url = `https://api.${process.env.DOMAIN}${verify_path}?token=${token}`;

    await sg.sendVerificationEmail(email, verify_url);
  }

  try {
    await googleData.push(ip, req.body.form_responses, {id: userCookie.value.id, maxAge: cookies.userCookieMaxAge}, email, {token_id, token_expires});
  } catch(e) {
    console.error(e);
    res.status(400).send("Error updating datastore");
    return;
  }

  res.cookie("dailyCookie", uuidv4(), cookies.daily_options);
  res.cookie("userCookieValue", userCookie.getValue(), cookies.user_options);
  res.status(200).send("Submit Success");
});

// determines if a cookie already exists
router.get("/read-cookie", (req, res) => {
  res.send(cookies.handleRead(req.signedCookies.userCookieValue, req.signedCookies.dailyCookie));
});

// clears cookie
router.delete("/clear-cookie", (req, res) => {
  res.clearCookie("userCookieValue").send("success");
});

router.get("/", (req, res) => {
  res.status(200).send(`COVID-19 ${process.env.BACKEND_BRANCH} BACKEND ONLINE`);
});

module.exports = router;
