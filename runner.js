var fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const jsonexport = require("jsonexport");
const bystring = require("object-bystring");
var testStepData = {};
var args = process.argv.slice(2);
// var swaggerDoc = JSON.parse(fs.readFileSync(args[0], "utf8"));
var testData = JSON.parse(fs.readFileSync("data.json", "utf8"));

const instance = axios.create({
  withCredentials: true,
  baseURL: process.env.SERVER_URL,
  headers: {},
});

const instance2 = axios.create({
  // withCredentials: true,
  baseURL: process.env.SERVER_URL,
  // headers: {},
})

fs.readdir(process.env.TESTS_DIR, async (error, fileNames) => {
  if (error) throw error;
  var testResults = [];

  // Login
  await login(instance);

  // Run Tests
  for (var fileCount = 0; fileCount < fileNames.length; fileCount++) {
    // Load test steps
    var testFile = fileNames[fileCount];
    var testCase = JSON.parse(
      fs.readFileSync(process.env.TESTS_DIR + "/" + testFile, "utf8")
    );
    var testCaseResult = false;
     // Run tests for instance 1
  await runTests(instance, fileNames, testResults);

  // Run tests for instance 2
  await runTests(instance2, fileNames, testResults);

    console.log("************ Executing Test: ", testCase.name, "*************");
 async function runTests(instance, fileNames, testResults) {
    for (
      var testStepCount = 0;
      testStepCount < testCase.steps.length;
      testStepCount++
    ) {
      var testStep = testCase.steps[testStepCount];
      var testResult = {};
      var requestPayload = populatePayload(testStep.payload);
   
      console.log("\x1b[30m", "Run => ", testStep.name);
      if (testStep.method == "delete")
        testResult = await testDelete(instance,testStep.api, requestPayload);
      else if (testStep.method == "post")
        testResult = await testPost(instance,testStep.api, requestPayload);
      else if (testStep.method == "put")
        testResult = await testPut(instance,testStep.api, requestPayload);
      else testResult = await testGet(instance,testStep.api, requestPayload);
        // console.log("RESULYYYYY", testResult);
      // check['test'] = {...check,testResult};
      if(instance === instance2)
      {
         if(testResult.httpStatus == 401)
         {
          console.log("Your testStep ", testStep.name , "is safe");
         }
      }
      else
      {
      testStepData[`$${testStep.name}`] = testResult.data;
      
      console.log("\x1b[30m", "Response Fetched => ", testStep.name);

      // Validate result
      if (testStep.expected.status == testResult.httpStatus) {
        console.log("\x1b[30m", "Validating Response => ", testStep.name);
        testCaseResult = validateResult(testStep.expected, testStepData);
        console.log("\x1b[34m", "Validated Response => ", testCaseResult);
      } else {
        testCaseResult = false;
        console.log("\x1b[31m", "Invalid Status Code => ", testResult.httpStatus);
      }

      if (testCaseResult == false) {
        console.log("\x1b[31m", "Fail => ", testStep.name);
        testCaseResult = false;
        // break;
      }

      // console.log("\x1b[32m", "Pass => ", testStep.name);
    }
   
    testResults.push({ test: testCase.name, status: testCaseResult });
    console.log("\x1b[30m","************ Completed *************");
  }

  // Save results
  jsonexport(testResults, function (err, csv) {
    if (err) return console.error(err);
    const outputFile = "results/test_result_" + new Date().getTime() + ".csv";
    fs.writeFile(outputFile, csv, function (err) {
      if (err) return console.error(err);
      console.log("\x1b[30m", "Results saved at ", outputFile);
    });
  })}};
})

async function login(instance) {
  // console.log("This is login instance", instance)
  var loginResult = await testPost(instance,"/api/TokenAuth/AuthenticateAdmin", {
    emailAddress: testData.adminUser,
    phoneNumber: "",
    countryCode: "",
    password: testData.adminPassword,
    isMobileRequest: false,
    deviceId: "",
    tenantId: 0,
    isSwaggerLogin: true,
    rememberMe: true,
  });

  if (loginResult.httpStatus != "200") {
    throw "Login failed!!";
  }
  instance.defaults.headers.Cookie = loginResult.headers["set-cookie"];

  var setTenantResult = await testPost(instance,"/api/TokenAuth/SwitchTenant", {
    tenantId: testData.tenantId,
    rememberMe: false,
    userName: testData.adminUser,
  });
  if (setTenantResult.httpStatus != "200") {
    throw "Login failed!!";
  }
  instance.defaults.headers.Cookie = setTenantResult.headers["set-cookie"];
}

function parseHrtimeToSeconds(hrtime) {
  var seconds = (hrtime[0] + hrtime[1] / 1e9).toFixed(3);
  return seconds;
}

//read directory
function populatePayload(payload, data) {
  // console.log("data", data);
  Object.keys(payload).forEach((key) => {
    if (payload[key].indexOf("$") == 1) {
      payload[key] = bystring(data, payload[key]);
    }
  });
  return payload;
}

function validateResult(expected, response) {
  // return false if incorrect status
  //if (expected.status != response.httpStatus) return false;

  // return false if expected is not same
  Object.keys(expected.response).forEach((responseKey) => {
    if (
      responseKey.indexOf("$") == 1 &&
      expected.response[responseKey] != bystring(response, responseKey)
    ) {
      return false;
    } else if (
      typeof expected.response[responseKey] === "string" &&
      expected.response[responseKey].indexOf("$") == 1 &&
      bystring(response.data, expected.response[responseKey]) !=
        bystring(response.data, responseKey)
    ) {
      return false;
    } else if (
      expected.response[responseKey] != bystring(response, responseKey)
    ) {
      return false;
    }
  });
  return true;
}

function testGet(instance,url, test) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    // data = populatePayload(data)
    instance
      .get(url)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}

function testPost(instance,url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    // var changeData = data;
    // // data = populatePayload(changeData)
    // console.log("I came here");
    // console.log("URLLLLLLLL", url);
    // console.log("DATAAAAAA", data);
    instance
      .post(url, data)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
          headers: res.headers,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}

function testPut(instance,url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    var changeData = data;
    //data = populatePayload(changeData)
    instance
      .put(url, data)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
          headers: res.headers,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}

function testDelete(instance,url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    var changeData = data;
    //data = populatePayload(changeData)
    instance
      .delete(url, data)
      .then((res) => {
        resolve({
          status: 1,
          httpStatus: res.status,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          data: res.data,
          headers: res.headers,
        });
      })
      .catch((err) => {
        resolve({
          status: 0,
          httpStatus: err.response ? err.response.status : 0,
          duration: parseHrtimeToSeconds(process.hrtime(startTime)),
          error: err.response ? err.response.statusText : err.code,
        });
      });
  });
}
