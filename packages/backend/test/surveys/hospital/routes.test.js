const { getApp } = require("../../../src/app");

const db = require("util-db/inMemoryDb");

const { login } = require("../../utils/requests");

const HospitalSurveySubmission = require("../../../src/surveys/hospital/submissionData");
const { getAllPermissionsExcept } = require("../../utils/permissions");
const { Permissions } = require("../../../src/volunteer/volunteerData");

const testData = {
  hospitalRequestBody: {
    metadata: {
      endTime: 1591912500498,
      timeToComplete: 25016,
      location: {
        lat: 43.7813248,
        lng: -79.35426559999999,
        accuracy: 1696,
        altitude: null,
        wasManual: false,
      },
      consentGiven: true,
    },
    schema: { form: "hospital", version: "1.0.0" },
    data: {
      hospitalPhoneNumber: "11 11 11 111",
      hospitalEmail: "test@test.ca",
      // submit: true,
      newPatients: 1,
      dischargedPatients: 2,
      occupiedHospitalBeds: 3,
      occupiedCriticalCareBeds: 4,
      availableBeds: 5,
      hospitalizedPatients: 6,
      confirmedCOVID19Cases: 7,
      suspectedCOVID19Cases: 8,
      negativeCOVID19Cases: 9,
    },
  },
  hospitalBadRequestBody: {
    metadata: {
      endTime: 1591912500498,
      timeToComplete: 25016,
      location: {
        lat: 43.7813248,
        lng: -79.35426559999999,
        accuracy: 1696,
        altitude: null,
        wasManual: false,
      },
      consentGiven: true,
    },
    schema: { form: "hospital", version: "1.0.0" },
    data: {
      hospitalPhoneNumber: "11 11 11 111",
      hospitalEmail: "test@test.ca",
      // submit: true,
      newPatients: 1,
      dischargedPatient: 2, // THIS LINE IS BAD
      occupiedHospitalBeds: 3,
      occupiedCriticalCareBeds: 4,
      availableBeds: 5,
      hospitalizedPatients: 6,
      confirmedCOVID19Cases: 7,
      suspectedCOVID19Cases: 8,
      negativeCOVID19Cases: 9,
    },
  },
};

describe("hospital survey submissions", () => {
  let app;

  beforeAll(async () => {
    await db.connect();
    app = await getApp();
  });

  afterEach(() => db.clear());
  afterAll(() => db.close());

  it("should add submission as expected", async () => {
    const { agent } = await login(app);

    await agent
      .post("/survey/hospital")
      .send(testData.hospitalRequestBody)
      .expect(200);

    const submissionDocuments = await HospitalSurveySubmission.model.find();

    expect(submissionDocuments).toHaveLength(1);
  });

  it("should fail for a user without the right permissions", async () => {
    // create two agents each one missing one of the permissions
    const { agent: agentAccess } = await login(
      app,
      getAllPermissionsExcept(Permissions.access)
    );

    const { agent: agentSubmitForms } = await login(
      app,
      getAllPermissionsExcept(Permissions.submitForms)
    );

    await agentAccess
      .post("/survey/hospital")
      .send(testData.hospitalRequestBody)
      .expect(403);

    await agentSubmitForms
      .post("/survey/hospital")
      .send(testData.hospitalRequestBody)
      .expect(403);

    const submissionDocuments = await HospitalSurveySubmission.model.find();

    expect(submissionDocuments).toHaveLength(0);
  });

  // eslint-disable-next-line jest/expect-expect
  it("should fail with 400 if body doesn't match schema", async () => {
    const { agent } = await login(app);

    await agent
      .post("/survey/hospital")
      .send(testData.hospitalBadRequestBody)
      .expect(400);

    const submissionDocuments = await HospitalSurveySubmission.model.find();

    expect(submissionDocuments).toHaveLength(0);
  });
});
