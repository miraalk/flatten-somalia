const { getApp } = require("../../../src/app");
const util = require("../../testUtils/mongo");

const { login } = require("../../testUtils/requests");

const submissionData = require("../../../src/submission/submissionData");
const volunteerData = require("../../../src/volunteer/volunteerData");

const sampleSubmission = {
  household: {
    someHouseholdData: "foo",
    followUpId: "bar-007",
  },
  people: [{ name: "personA" }, { name: "personB" }],
  deaths: [{ name: "personC" }],
  metadata: { filledOutTimestamp: Date.now(), consentGiven: true },
  schema: {
    form: "volunteerInitialForm",
    version: "0.1",
  },
};

const sampleSubmissionInvalid = {
  household: {
    someHouseholdData: "foo",
    followUpId: "bar-007",
  },
  people: [{ name: "personA" }, { name: "personB" }],
  deaths: [{ name: "personC" }],
  // no consent given -> invalid
  metadata: { filledOutTimestamp: Date.now() },
  schema: {
    form: "volunteerInitialForm",
    version: "0.1",
  },
};

describe("test /auth", () => {
  let app;

  beforeAll(async () => {
    await util.connectToDatabase();
    app = await getApp();
  });

  afterEach(async () => {
    await util.clearDatabase();
    jest.clearAllMocks();
  });
  afterAll(async () => await util.closeDatabase());

  it("should add submissions, people, and households as expected for an initial submission", async () => {
    const { agent } = await login(app);

    await agent
      .post("/submit/initial")
      .send(sampleSubmission)
      .set("Content-Type", "application/json")
      .set("Accept", "application/json")
      .expect(200);

    const allSubmissions = await submissionData.Submission.find();
    const allHouseholds = await submissionData.Household.find();
    const allPeople = await submissionData.Person.find();

    expect(allSubmissions).toHaveLength(1);
    expect(allHouseholds).toHaveLength(1);
    expect(allPeople).toHaveLength(3);

    const submission = allSubmissions[0];
    const household = allHouseholds[0];

    expect(submission.household.ref).toStrictEqual(household._id);
    expect(submission.household.data).toStrictEqual(sampleSubmission.household);

    expect(household.followUpId).toStrictEqual(
      sampleSubmission.household.followUpId
    );

    const allVolunteers = await volunteerData.Volunteer.find();
    expect(allVolunteers).toHaveLength(1);

    expect(allVolunteers[0].teamName).toStrictEqual(submission.teamName);
  });

  it("should fail for a user without the right permissions", async () => {
    const { agent } = await login(app, { permissions: [] });

    await agent
      .post("/submit/initial")
      .send(sampleSubmission)
      .set("Content-Type", "application/json")
      .set("Accept", "application/json")
      .expect(403);

    const allSubmissions = await submissionData.Submission.find();
    const allHouseholds = await submissionData.Household.find();
    const allPeople = await submissionData.Person.find();

    expect(allSubmissions).toHaveLength(0);
    expect(allHouseholds).toHaveLength(0);
    expect(allPeople).toHaveLength(0);
  });

  it("should fail for an invalid submission", async () => {
    const { agent } = await login(app);

    await agent
      .post("/submit/initial")
      .send(sampleSubmissionInvalid)
      .set("Content-Type", "application/json")
      .set("Accept", "application/json")
      .expect(400);

    const allSubmissions = await submissionData.Submission.find();
    const allHouseholds = await submissionData.Household.find();
    const allPeople = await submissionData.Person.find();

    expect(allSubmissions).toHaveLength(0);
    expect(allHouseholds).toHaveLength(0);
    expect(allPeople).toHaveLength(0);
  });
});