const { verifyTokenAndMakeCookie } = require("../verificationAPI");
const { getConfig } = require("util-config");
const { log } = require("util-logging");

// Verifies a token in the request and gives the user a cookie.
module.exports = async (req, res) => {
  const token = req.query.token;

  if (!token || typeof token !== "string") {
    res.status(400).send("No token included.");
    log.warning("Failed due to missing token.", { status: 400 });
    return;
  }

  const tokenContent = await verifyTokenAndMakeCookie(token);

  res.cookie("id", tokenContent.id, {
    expires: tokenContent.expiry,
    // secure cookies not wanted in dev environment
    secure: getConfig().secureCookies,
    signed: true,
    httpOnly: true,
    sameSite: "Lax",
  });

  res.redirect(303, getConfig().urls.frontendHost);
  log.info("Successfully issued cookie.", { status: 303 });
};
