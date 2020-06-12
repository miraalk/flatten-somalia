const { FormSchema, SubmissionMetadata } = require("../sharedDataSchemas");
const Util = require("../dataUtil");

const model = Util.createModel("HospitalSurveySubmission", {
  metadata: SubmissionMetadata,
  surveyData: {
    submissionSchema: FormSchema,
    hospitalPhoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    hospitalEmail: String,
    newPatients: Number,
    dischargedPatients: Number,
    occupiedHospitalBeds: Number,
    occupiedCriticalCareBeds: Number,
    availableBeds: Number,
    hospitalizedPatients: Number,
    confirmedCOVID19Cases: Number,
    suspectedCOVID19Cases: Number,
    negativeCOVID19Cases: Number,
  },
});

const create = async (content) => {
  const submissionDocument = new model(content);
  await submissionDocument.validate();
  return submissionDocument;
};

const save = async (document) => await document.save();

module.exports = { model, save, create };
