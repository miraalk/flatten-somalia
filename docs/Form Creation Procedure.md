# Adding New Forms

Adding a new form is as easy as 1, 2, 3, 4, ..., n!

## Summary

Roughly in order, the steps are as follows:

* _Frontend Setup_
  * Create a page for the form
  * Create the form.io JSON
  * Add tranlsations
* _Backend Setup_
  * Create the form's data model
  * Create a submission route
* _Testing_
  * Complete the Manual Integration Tests
  * Write automated integration tests
* _Deployment_
  * Deploy & test in staging
  * Pass code review
  * Deploy & test in production


## 1 Frontend Setup

Here, paths start in the root frontend directory.

#### 1.1 Frontend Configuration

**1.1.1** Create a short, descriptive variable name for the form `<formName>`.

**1.1.2** Create the form.io JSON file at `src/forms/<formName>/form.json` with at least the following:
```
{
  "type": "form",
  "display": "wizard",
  "components": [
    {
      "type": "panel"
    }
  ]
}
```
This is a bare minimum form.io form, resulting in nothing but Submit and Cancel buttons.

**1.1.3** Create a changelog at `src/forms/<formName>/CHANGE_LOG.txt` with the following:
```
<formTitle> CHANGELOG

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
version  |  commit (optional)

	* changes

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```
The first version deployed to production should be numbered `1.0.0`.

**1.1.4** Specify the form's backend submission route in `src/backend/api/api.js` by adding 
```
  <formName>: { method: "POST", url: "/survey/<formName>" },
```
to the default exports object.

**1.1.5** Setup `src/config.js`.

**1.1.5.1** Import the form.io JSON:
`import <formName>JSON from ./forms/<formName>/form.json`

**1.1.5.2** Specify the form's frontend URL in the `Routes` object by adding:
`  <formName>: /surveys/<formName>,`

**1.1.5.3** Specify the form's schema in the `Schema` object by adding:
```
  <formName>: {
    form: "<formName>",
    version: "0.0.0",
  },
```

**1.1.5.4** Specify the form's configuration in the `Surveys` object by adding:
```
  <formName>: {
    route: Routes.<formName>,
    surveyKey: "<formName>",
    i18nTitleKey: "<formName>Title",
    api: api.<formName>,
    formIOJSON: <formName>JSON,
    onSubmit: defaultSurveySubmitterFactory(
      api.<formName>,
      Schemas.<formName>
    ),
    options: {
      `enableManualLocation`: false,
    },
  },
```
The `enableManualLocation` option determines whether users can manually input location if device location is unavailable.

**1.1.6** Add the survey page to the site in `src/ui/App.js` by adding 
```
        {makeSurveyRoute(Surveys.initialBRA)}
```
to `AuthenticatedAppContent`, after the other surveys in the `<Switch>` block.

**1.1.7** Add a button to reach the form in `src/ui/home/Home.js` by adding
```
      <HomeSurveyButton survey={Surveys.initialBRA} />
```
to `home`, after the other surveys.

#### 1.2 form.io JSON Creation

The form.io JSON can be created manually, or through the form.io online editor.

**1.2.1** Ensure each component has a unique and descriptive `label` field – this is the component's localization key.

**1.2.2** Ensure each component has a unique and descriptive `key` field – this is the component's key in the data model.

**1.2.3.1** Components with selectable answers should specify the answers in a `values` array.

**1.2.3.2** Each option's `label` field becomes its localization key.

**1.2.3.3** Each option's `value` field becomes its value in the data.

**1.2.3** Refer to the form.io documentation to learn about other options, such as conditional components, input validation, and more.

#### 1.3 Translations

Steps to complete for each language `<lang>`.

**1.3.1** Add the form's title string to `src/translations/<lang>/Surveys.json` with key `<formName>Title`.

**1.3.2** Create `src/translations/<lang>/translation/<formName>.json`, and add localization strings for each form.io component.
The file should contain an empty object `{}` at the very minimum.

**1.3.3** In `src/i18n.js`, import the form.io component translations by adding the following:
```
import formIO<formName><lang> from "./translations/<lang>/translation/<formName>.json";
```

**1.3.4** Add the form.io component translations by adding 
```
      ...formIO<formName><lang>,
```
to the `resources.<lang>.translation` object.

## 2 Backend Setup

Here, paths start in the root backend directory.

#### 2.1 Data Model

**2.1.1** Create `src/surveys/<formName>/submissionData.js` with 
```
const { FormSchema, getSubmissionMetadata } = require("../sharedDataSchemas");
const { createModel } = require("../../utils/mongoose");

const model = createModel("<formName>Submission", {
  metadata: getSubmissionMetadata(<locationRequired>),
  surveyData: {
    submissionSchema: FormSchema,
    <dataModel>,
  },
});

const create = async (content) => {
  const submissionDocument = new model(content);
  await submissionDocument.validate();
  return submissionDocument;
};

const saveAsync = (document) => document.save();

module.exports = { model, saveAsync, create };

```
`<locationRequired>` is a boolean.
`<dataModel>` is the form's data model.

**2.1.2** Create `src/surveys/<formName>/api.js` with 
```
const <formName>Submission = require("./submissionData");

async function submit<formName>(
  volunteerId,
  volunteerTeamName,
  submissionSchema,
  metadata,
  surveyData
) {
  const document = await <formName>Submission.create({
    metadata: {
      addedBy: volunteerId,
      teamName: volunteerTeamName,
      ...metadata,
    },
    surveyData: {
      submissionSchema,
      ...surveyData,
    },
  });

  await <formName>Submission.saveAsync(document);
}

module.exports = { submit<formName> };

```

#### 2.2 Submission Route

**2.2.1** Create `src/surveys/<formName>/submissionRoute.js` with
```
const { submit<formName> } = require("./api");
const { log } = require("util-logging");

module.exports = async (req, res) => {
  await submit<formName>(
    res.locals.volunteer._id,
    res.locals.volunteer.teamName,
    req.body.schema,
    req.body.metadata,
    req.body.data
  );
  res.sendStatus(200);
  log.info("Successfully submitted <formTitle>.", { status: 200 });
};

```
`<formTitle>` is the pretty, user facing form name.

**2.2.2** Add the API route in `src/routes.js` by adding 
```
/**
 * @api {post} /survey/<formName> Submit a <formTitle>.
 * @apiName SubmitForm<formName>
 * @apiGroup Submissions
 *
 * @apiParamExample {json} Request-Example:
 *                  body:
 *                  {
 *                    "schema" : { form: <formName>, version: <formVersion> },
 *                    "metadata": { location: { <location data> }, <timing data...> },
 *                    "data": { <form.io survey data> }
 *                  }
 */
router.post(
  "/survey/<formName>",
  protectedMiddleware([Permissions.submitForms]),
  submitHospitalRoute,
  surveyErrorHandler
);

```
after the other survey submission routes.