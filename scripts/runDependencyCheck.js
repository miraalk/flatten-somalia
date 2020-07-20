const depCheck = require("depcheck");
const fs = require("fs");

const printError = (packageName, type, json) => {
  console.log(
    `Package: ${packageName}. ${type}. ${JSON.stringify(json) || ""}`
  );
};

const onScanComplete = (packageName) => (unused) => {
  if (unused.dependencies.length > 0)
    printError(packageName, "Unused dependency", unused.dependencies);

  if (unused.devDependencies.length > 0)
    printError(packageName, "Unused dev dependency", unused.devDependencies);

  if (Object.keys(unused.missing).length > 0)
    printError(packageName, "Missing dependency", unused.missing);

  if (Object.keys(unused.invalidFiles).length > 0)
    printError(packageName, "could'nt access/parse files", unused.invalidFiles);

  if (Object.keys(unused.invalidDirs).length > 0)
    printError(packageName, "could not access/parse dirs", unused.invalidDirs); // directories that cannot access

  if (packageName !== "db-utils" && unused.using.mongoose)
    printError(
      packageName,
      "Should not import mongoose. db-utils should be the only package importing mongoose. See README"
    );
};

const main = () => {
  depCheck(process.cwd(), {}, onScanComplete("root"));

  const packages = fs.readdirSync("packages");
  for (const curPackage of packages) {
    depCheck(
      process.cwd() + `/packages/${curPackage}`,
      {},
      onScanComplete(curPackage)
    );
  }
};

main();
