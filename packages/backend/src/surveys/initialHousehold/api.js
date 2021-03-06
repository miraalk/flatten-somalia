const Submission = require("./submissionData");
const Household = require("./householdData");
const Person = require("./peopleData");
const { ApiError } = require("../../utils/errors");
const { runOpWithinTransaction } = require("../../utils/mongoose");

async function initialSubmission(
  volunteerId,
  volunteerTeamName,
  schema,
  metadata,
  peopleData,
  deathsData,
  householdData
) {
  // required because (for example) we call householdData.followUpId which will crash if householdData is undefined
  if (!householdData) throw new ApiError("Household data not provided", 400);

  const household = await Household.create(
    householdData.followUpId,
    householdData.phone,
    householdData.email
  );

  const peopleModel = peopleData.map((person) => {
    return {
      name: person.name,
      gender: person.gender,
      household: household._id,
      alive: true,
    };
  });

  const deathsModel = deathsData.map((death) => {
    return {
      name: death.name,
      gender: death.gender,
      household: household._id,
      alive: false,
    };
  });

  const people = await Person.createManyAsync(
    [].concat(peopleModel, deathsModel)
  );

  const submission = await Submission.create(
    volunteerId,
    volunteerTeamName,
    schema,
    metadata,
    people.map((person) => person._id),
    [].concat(peopleData, deathsData),
    household._id,
    householdData
  );

  await runOpWithinTransaction(async (session) => {
    for (const person of people) await person.save({ session });
    await household.save({ session });
    await submission.save({ session });
  });
}

module.exports = { initialSubmission };
