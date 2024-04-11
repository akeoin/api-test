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

//read directory
const populatePayload = (data) => {
  // console.log("data", data);
  Object.keys(data).forEach((key) => {
      const value = data[key];
      console.log(`Key: ${key}, Value: ${value}`);
      if(value.charAt(0) === '$')
      {
        const string = value;
        console.log("Doller aaya doller");
        const startIndex = string.indexOf('$');
        const endIndex = string.indexOf('.'); 
        
        const firstValue = string.substring(startIndex, endIndex); // Extract the substring from the startIndex to the endIndex


             const parts = string.split('.');
                const SecondValue = parts.slice(1).join('.'); 
           console.log("Second Value",SecondValue);
        // console.log(firstValue,"+++++++++++++++++++++++"); 
       
          if (testStepData.hasOwnProperty(firstValue)) {
            const value = testStepData[firstValue];
            console.log(`Key: ${firstValue}`);
            console.log(`Value:`);
            console.log(typeof(value),"%%%%%%%%%%%%%");
             
            
          }
        }
  });
};


fs.readdir(process.env.TESTS_DIR, async (error, fileNames) => {
  if (error) throw error;
  var testResults = [];

  // Login
  await login();
  
  // Run Tests
  for (var fileCount = 0; fileCount < fileNames.length; fileCount++) {
    // Load test steps
    var testFile = fileNames[fileCount];
    var testCase = JSON.parse(fs.readFileSync(process.env.TESTS_DIR + "/" + testFile, "utf8"));
    var testCaseResult = false;
 

    for (var testStepCount = 0; testStepCount < testCase.steps.length; testStepCount++) {

        // Run test step
        var testStep = testCase.steps[testStepCount];
        var testResult = {};
        
        if(testStep.method == "delete") testResult = await testDelete(testStep.api, testStep.payload);
        else if(testStep.method == "post") testResult = await testPost(testStep.api, testStep.payload);
        else if(testStep.method == "put") testResult = await testPut(testStep.api, testStep.payload);
        else testResult = await testGet(testStep.api, testStep.payload);

        // check['test'] = {...check,testResult};
        testStepData[`$${testStep.name}`] = testResult.data;
        
        // console.log(">>>>>>>>>>>>>>>>>>", check);
        //  console.log(testResult)
        // Validate result
        testCaseResult = validateResult(testStep.expected, testStepData);
        

        //   if (swaggerDoc.paths[apiPath].get != null) {
        //   }
    }
    // console.log("Final test result" , checktestResult)
    // console.log(">>>>>>>>>>>>>>>>>>", check);
    testResults.push({ test: testCase.name, status: testCaseResult });
    console.log("TESTRESULTSSSSSSSSSSSSSSSS", testResults);


    // Save results
    jsonexport(testResults, function (err, csv) {
      if (err) return console.error(err);
      const outputFile = "results/test_result_" + new Date().getTime() + ".csv";
      fs.writeFile(outputFile, csv, function (err) {
        if (err) return console.error(err);
        console.log("Results saved at ", outputFile);
      });
    });
  }
});

async function login() {
  var loginResult = await testPost("/api/TokenAuth/AuthenticateAdmin", {
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

  var setTenantResult = await testPost("/api/TokenAuth/SwitchTenant", {
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

function validateResult(expected, response) {
  // return false if incorrect status
  if (expected.status != response.httpStatus) return false;
  Object.keys(expected.response).forEach((responseKey) => {
    // return false if expected is not same
    if (expected.response[responseKey] != bystring(response.data, responseKey))
      return false;
  });
  return true;
}

function testGet(url, test) {
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

function testPost(url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    // var changeData = data;
    // data = populatePayload(changeData)
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

function testPut(url, data) {
  return new Promise((resolve, reject) => {
    var startTime = process.hrtime();
    var changeData = data;
    data = populatePayload(changeData)
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

function testDelete(url, data) {
    return new Promise((resolve, reject) => {
      var startTime = process.hrtime();
      var changeData = data;
      data = populatePayload(changeData)
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