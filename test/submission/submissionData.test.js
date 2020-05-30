const submissionData = require("../../src/submission/submissionData");
const util = require("../testUtils/mongo");
const { setup } = require("../../src/index");

const mongoose = require("mongoose");

const dummyVolunteerId = "56cb91bdc3464f14678934ca";
const testSubmissions = [
  {
    addedBy: mongoose.Types.ObjectId(dummyVolunteerId),
    submissionSchema: {
      form: "householdInitialSubmission",
      version: "1.0",
    },
    metadata: {
      location: {
        lat: 0,
        long: 0,
      },
      filledOutTimestamp: Date.now(),
      timeToComplete: 3000,
      consentGiven: true,
    },
  },
  {
    addedBy: mongoose.Types.ObjectId(dummyVolunteerId),
    submissionSchema: {
      form: "householdFollowupSubmission",
      version: "1.0",
    },
    metadata: {
      location: {
        lat: 50,
        long: 50,
      },
      filledOutTimestamp: Date.now(),
      timeToComplete: 2000,
      consentGiven: true,
    },
  },
];
const testHouseholdData = [
  {
    publicId: "90210",
    email: "test@example.com",
    phone: "01189998819991197253",
  },
  {
    publicId: "90020",
    email: "billgates@example.com",
    phone: "240240240",
  },
];
const testPeopleInitial = [
  [{ name: "John Doe" }, { name: "Jane Doe" }],
  [{ name: "Hello World" }],
];

const retrieveById = (all, id) =>
  all.filter((obj) => obj._id.toString() === id.toString())[0];

describe("submission database functions", () => {
  beforeAll(async () => {
    await setup(false);
    await util.connectToDatabase();
  });

  afterEach(async () => await util.clearDatabase());
  afterAll(async () => await util.closeDatabase());

  it("should write submission to database", async () => {
    const householdId = await submissionData.createHousehold(
      testHouseholdData[0].publicId
    );

    const peopleIds = await submissionData.createPeople(
      testPeopleInitial[0].map((person) => {
        return { ...person, household: householdId };
      })
    );
    const submissionId = await submissionData.createSubmission(
      testSubmissions[0].addedBy,
      testSubmissions[0].submissionSchema,
      testSubmissions[0].metadata,
      peopleIds,
      testPeopleInitial[0],
      householdId,
      testHouseholdData[0]
    );

    const all = await submissionData.Submission.find();
    expect(all).toHaveLength(1);

    const retrievedSubmission = all[0];

    expect(retrievedSubmission._id).toStrictEqual(submissionId);
    expect(testSubmissions[0].addedBy).toStrictEqual(
      retrievedSubmission.addedBy
    );
    expect(testSubmissions[0].submissionSchema.form).toStrictEqual(
      retrievedSubmission.submissionSchema.form
    );
    expect(testSubmissions[0].submissionSchema.version).toStrictEqual(
      retrievedSubmission.submissionSchema.version
    );
    expect(testSubmissions[0].metadata.filledOutTimestamp).toStrictEqual(
      retrievedSubmission.metadata.filledOutTimestamp
    );
    expect(testSubmissions[0].metadata.timeToComplete).toStrictEqual(
      retrievedSubmission.metadata.timeToComplete
    );
    expect(testSubmissions[0].metadata.consentGiven).toStrictEqual(
      retrievedSubmission.metadata.consentGiven
    );
  });

  it("should create a household correctly", async () => {
    const householdId = await submissionData.createHousehold(
      testHouseholdData[0].publicId,
      testHouseholdData[0].phone,
      testHouseholdData[0].email
    );

    const all = await submissionData.Household.find();

    expect(all).toHaveLength(1);
    const retrievedHousehold = all[0];

    expect(retrievedHousehold._id).toStrictEqual(householdId);
    expect(retrievedHousehold.publicId).toStrictEqual(
      testHouseholdData[0].publicId
    );
    expect(retrievedHousehold.phone).toStrictEqual(testHouseholdData[0].phone);
    expect(retrievedHousehold.email).toStrictEqual(testHouseholdData[0].email);
  });

  it("should create a person correctly", async () => {
    const householdId = await submissionData.createHousehold(
      testHouseholdData[0].publicId
    );

    const peopleIds = await submissionData.createPeople(
      testPeopleInitial[0].map((person) => {
        return { ...person, household: householdId };
      })
    );

    const all = await submissionData.Person.find();

    expect(all).toHaveLength(2);

    for (const [i, id] of Object.entries(peopleIds)) {
      const personDb = all.filter(
        (obj) => obj["_id"].toString() === id.toString()
      )[0];
      expect(personDb.name).toStrictEqual(testPeopleInitial[0][i].name);
      expect(personDb.household.toString()).toStrictEqual(
        householdId.toString()
      );
    }
  });

  it("should handle follow up submissions correctly", async () => {
    const householdIds = [];
    const peopleIdsNested = [];
    const submissionIdsInitial = [];

    // 1. Create submissions associated with two different households.

    for (const [i, householdData] of Object.entries(testHouseholdData)) {
      householdIds.push(
        await submissionData.createHousehold(
          householdData.publicId,
          householdData.phone,
          householdData.email
        )
      );
      peopleIdsNested.push(
        await submissionData.createPeople(
          testPeopleInitial[i].map((o) => {
            return { ...o, household: householdIds[i] };
          })
        )
      );

      submissionIdsInitial.push(
        await submissionData.createSubmission(
          dummyVolunteerId,
          testSubmissions[i].submissionSchema,
          testSubmissions[i].metadata,
          peopleIdsNested[i],
          testPeopleInitial[i],
          householdIds[i],
          householdData
        )
      );
    }


    // 2. Test that the next follow up submission resolves correctly to the
    //  first submission, and that the entries within this submission are correct
    // TODO - make this test query by volunteer id and district
    // once we decide to support those things in the code

    let [
      nextId,
      nextHousehold,
      nextPeople,
    ] = await submissionData.getVolunteerNextFollowUp(
      dummyVolunteerId,
      "not yet implemented",
      0
    );

    expect(nextId).toStrictEqual(submissionIdsInitial[0]);
    expect(nextHousehold._id).toStrictEqual(householdIds[0]);
    expect(
      new Set(peopleIdsNested[0].map((o) => o._id.toString()))
    ).toStrictEqual(new Set(nextPeople.map((o) => o._id.toString())));

    const testPeopleFollowUp = [{ testField: "1" }, { testField: "2" }];
    const householdFollowUp = { someUpdatedProperty: "hello" };

    // 3. Insert the follow up submission using the interface (assertions below
    // check that this inserts reference to next submission correctly and resets the flag).

    const newSubmissionId = await submissionData.createFollowUpSubmisison(
      nextId,
      dummyVolunteerId,
      { form: "volunteerFollowUpForm", version: "0.1" },
      testSubmissions[0].metadata,
      peopleIdsNested[0],
      testPeopleFollowUp,
      householdIds[0],
      householdFollowUp
    );

    // 4. Test grabbing the next submission to follow up with, specifically
    // to ensure that we do not end up grabbing the original submission
    // (meaning dequeuing of the original submission happened correctly).

    [
      nextId,
      nextHousehold,
      nextPeople,
    ] = await submissionData.getVolunteerNextFollowUp(
      dummyVolunteerId,
      "not yet implemented",
      0
    );

    expect(nextId).not.toStrictEqual(submissionIdsInitial[0]);

    const all = await submissionData.Submission.find();

    const oldSubmission = retrieveById(all, submissionIdsInitial[0]._id);
    expect(oldSubmission.followUp.id.toString()).toStrictEqual(
      newSubmissionId.toString()
    );
    expect(oldSubmission.followUp.inProgress).toBe(false);
  });
});
