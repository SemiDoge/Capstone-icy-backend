/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable require-jsdoc */

const express = require('express');
const Joi = require('joi');
const {Dbase} = require('./database');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const {window} = new JSDOM();
const {document} = (new JSDOM('')).window;
global.document = document;
const {Log} = require('./log');

const Logger = new Log();

// -auth-
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'icy-cap',
});
// ------

const $ = jQuery = require('jquery')(window);

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: 'icy-backend',
  api_key: '257535168132857',
  api_secret: 'A_FE-Sea2XXFT3y00_pmAGjdBBw',
  secure: true,
});

// Connect to the database.
Dbase.cacheData();
const reports = []; // stores all the reports coming from the /reports endpoint

app.get('/styles.css', (req, res) => {
  res.sendFile(__dirname + '/styles.css');
});

app.get('/', (req, res) => {
  res.contentType = res.type('html');
  res.sendFile(__dirname + '/main.html');
  Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 200, 'Requester went to main page');
});

// /locations
app.get('/locations', async (req, res) => {
  if (isEmptyObject(Dbase.dataCache)) {
    await Dbase.cacheData();
  }
  const filters = req.query;

  let dataFiltered = Dbase.dataCache.filter( (data) => {
    let isValid = true;
    // eslint-disable-next-line guard-for-in
    for (key in filters) {
      if (key == 'amenities') {
        if (Array.isArray(filters[key])) {
          isValid = isValid && containsAll(filters[key], data[key]);
        } else {
          const someArray = [];
          someArray.push(filters[key]);
          isValid = isValid && containsAll(someArray, data[key]);
        }
      } else if (key != 'long' || key != 'lat' || key != 'dist') {
        if (typeof data[key] == 'string') {
          isValid = isValid && data[key].includes(filters[key]);
        } else if (typeof data[key] == 'number') {
          isValid = isValid && data[key] == parseInt(filters[key]);
        }
      }
    }
    return isValid;
  });

  if (filters['long'] && filters['lat'] && filters['dist'] &&
  !isEmptyObject(dataFiltered)) {
    // convert km distance to nautical degrees
    const nauConst = 0.00909090909090909;

    const kmDist = parseFloat(filters['dist']);
    const nauDeg = nauConst*(kmDist);

    dataFiltered = dataFiltered.filter( (data) => {
      let isValid = false;

      // eslint-disable-next-line max-len
      if (parseFloat(filters['long']) <= data['longitude'] + nauDeg && parseFloat(filters['long']) >= data['longitude'] - nauDeg && parseFloat(filters['lat']) <= data['latitude'] + nauDeg && parseFloat(filters['lat']) >= data['latitude'] - nauDeg) {
        isValid = true;
      }

      return isValid;
    });
  }

  if (isEmptyObject(dataFiltered)) {
    res.status(404).send('The query returned no results.');
    Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 404, 'No locations found for requester query');
  } else {
    let uCoordProv = false;
    // if user coordinates given
    if (req.query.long && req.query.lat) {
      uCoordProv = true;
      assignDistances(dataFiltered, req.query.lat, req.query.long);
    }

    // sort according to sort parameters if any
    if (req.query.sort == `AZ`) {
      sortByLetterAZ(dataFiltered);
    } else if (req.query.sort == `ZA`) {
      sortByLetterZA(dataFiltered);
    } else if (req.query.sort == `BS` && uCoordProv == true) {
      sortByNumBigSmall(dataFiltered);
    } else if (req.query.sort == `SB` && uCoordProv == true) {
      sortByNumSmallBig(dataFiltered);
    }
    // example call for custom cloudlinary interface
    assignCloudinaryUrls(dataFiltered, 25, 500, 250);
    res.send(dataFiltered);
    Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 200, 'Requester received data from location query');
  }
});

// End point for the front end to post ice condition reports to the back end.
app.post('/reports', (req, res) => {
  verifyUser(req.headers.token).then((result) => {
    if (isEmptyObject(result)) {
      // user NOT validated
      res.status(403).send('Forbidden, no valid user ID token provided in header -> token or the user is not authorized to submit a report.');
      Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 403, 'Requester was forbidden from accessing /reports');
      return;
    }

    const {error} = validateReport(req.body);
    if (error) {
      res.status(400).send(error.message);
      Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 400, error.message);
      return;
    }

    const currentDate = new Date();
    const report = {
      time: currentDate.getFullYear() + '-' + ('0' + (currentDate.getMonth() + 1)).slice(-2) + '-' + currentDate.getDate() + ' ' + ('0' + currentDate.getHours()).slice(-2) + ':' + ('0' + currentDate.getMinutes()).slice(-2) + ':' + ( '0' + currentDate.getSeconds()).slice(-2),
      venueID: req.body.venueID,
      condition: req.body.condition,
      inUse: req.body.inUse,
      hockeyGame: req.body.hockeyGame,
      skaters: req.body.skaters,
    };

    reports.push(report);

    res.send(`Thanks for your report for venue #${report.venueID}! (${reports.length} reports collected.)`);
    Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 200, `Thanks for your report for venue #${report.venueID}! (${reports.length} reports collected)`);
  });
});

// Returns the most recent report supplied to the backend based on the ID passed.
app.get('/reports', (req, res) => {
  if (req.query.venueID) {
    const allReportsForID = reports.filter((item) => {
      return parseInt(item.venueID) === parseInt(req.query.venueID);
    });

    if (isEmptyObject(allReportsForID)) {
      res.status(404).send(`Could not find a report for this venue (venueID: ${req.query.venueID})`);
      Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 404, `Could not find a report for this venue (ID: ${req.query.venueID})`);
    } else {
      res.send(allReportsForID[allReportsForID.length - 1]);
      Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 200, `Reports sent to requester for venue: ${req.query.venueID}`);
    }
  } else {
    res.status(400).send(`Improper response provided (possibly no venueID in query string).`);
    Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 400, `Improper response provided (possibly no venueID in query string)`);
  }
});

// a DELETE example
// DELETE /locations?loc=x will delete x from the rinks array
app.delete('/locations', (req, res) => {
  /* const rink = Dbase.rinks.find(r => r.id === parseInt(req.query.loc));
  if (!rink) {
    res.status(404).send("There is no such rink with the given id.");
    return;
  }*/

  // Dbase.deleteFromRink(parseInt(req.query.loc));
  res.status(501).send('Deleting from rink feature disabled!');
  Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 501, 'Request to disabled DELETE endpoint');
});

app.post('/userRole', (req, res) => {
  const {error} = validateUID(req.body);
  if (error) {
    res.status(400).send(error.message);
    Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 400, error.message);
    return;
  }

  Dbase.getUserRoles(req.body.UID).then( (result) => {
    let roleReport = result;

    if (isEmptyObject(roleReport)) {
      roleReport = [{
        UID: req.body.UID,
        userType: 1,
        description: 'STANDARD',
      }];
    }
    res.send(roleReport);
    Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 200, `Requester received user role report for user: ${req.body.UID}`);
  });
});

app.post('/peopleCount', (req, res) => {
  verifyUser(req.headers.token).then((result) => {
    if (isEmptyObject(result)) {
      // user NOT validated
      res.status(403).send('Forbidden, no valid user ID token provided in header -> token or the user is not authorized to submit peopleCount.');
      Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 403, 'Requester was forbidden from accessing /peopleCount');
      return;
    }

    if (isEmptyObject(req.body) || req.body.number == undefined || req.body.id == undefined) {
      res.status(400).send('Request body was malformed, ie: empty or missing information.');
      Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 400, 'Request body was malformed, ie: empty or missing information.');
      return;
    }

    Dbase.updateNumPeople(req.body.number, req.body.id).then((result) => {
      if (result) {
        res.status(200).send(`Venue: #${req.body.id} UPDATED.`);
        Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 200, `Venue: #${req.body.id} UPDATED.`);
      } else {
        res.status(400).send(`Venue: #${req.body.id} NOT UPDATED: Provided ID was incorrect or number of people (${req.body.number}) would decrement below 0`);
        Logger.logResponse(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 400, `Venue: #${req.body.id} NOT UPDATED: Provided ID was incorrect or number of people (${req.body.number}) would decrement below 0`);
      }
    });
  });
});

app.listen(port, () => {
  Logger.logger.info(`icy-backend is listening on port: ${port}`);
});

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}

function containsAll(needles, haystack) {
  for (let i = 0; i < needles.length; i++) {
    if ($.inArray(needles[i], haystack) == -1) return false;
  }
  return true;
}

// this function validates the input coming in from the HTTP request
// TODO: Ideally, the max venueId should be determined programmatically via a database query.
function validateReport(requestBody) {
  const schema = Joi.object({
    venueID: Joi.number().min(1).max(68).required(),
    condition: Joi.number().min(0).max(2).required(),
    inUse: Joi.boolean().required(),
    hockeyGame: Joi.boolean().required(),
    skaters: Joi.number().min(0).max(15).required(),
  });

  return schema.validate(requestBody);
}

// Validates that a UID is provided when returning user role.
function validateUID(requestBody) {
  const schema = Joi.object({
    UID: Joi.string().alphanum().min(28).max(28).required(),
  });

  return schema.validate(requestBody);
}

function sortByLetterAZ(arrayToSort) {
  arrayToSort.sort((a, b) => {
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();

    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
}

function sortByLetterZA(arrayToSort) {
  arrayToSort.sort((a, b) => {
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();

    if (nameA > nameB) {
      return -1;
    }
    if (nameA < nameB) {
      return 1;
    }
    return 0;
  });
}

function sortByNumSmallBig(arrayToSort) {
  arrayToSort.sort((a, b) => {
    const numA = a.distance;
    const numB = b.distance;

    if (numA < numB) {
      return -1;
    }
    if (numA > numB) {
      return 1;
    }
    return 0;
  });
}

function sortByNumBigSmall(arrayToSort) {
  arrayToSort.sort((a, b) => {
    const numA = a.distance;
    const numB = b.distance;

    if (numA > numB) {
      return -1;
    }
    if (numA < numB) {
      return 1;
    }
    return 0;
  });
}

function assignCloudinaryUrls(arrayToAssign, totalNumOfImages, iWidth, iHeight) {
  let i = 1;
  arrayToAssign.forEach( (rink) => {
    if (i == totalNumOfImages + 1) {
      i = 1;
    }

    rink.imageUrl = cloudinary.url(`${i}.jpg`, {width: iWidth, height: iHeight});
    i++;
  });
}

function assignDistances(arrayToAssign, observerLat, observerLong) {
  arrayToAssign.forEach( (rink) => {
    rink.distance = distBetweenCoords(observerLat, observerLong, rink.latitude, rink.longitude);
  });
}

function toRadians(deg) {
  return deg * (Math.PI / 180);
}

function distBetweenCoords(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = toRadians(parseFloat(lat2)-parseFloat(lat1));
  const dLon = toRadians(parseFloat(lon2)-parseFloat(lon1));

  lat1 = toRadians(lat1);
  lat2 = toRadians(lat2);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return earthRadiusKm * c;
}

async function verifyUser(token) {
  const resultVerify = await new Promise((resolve, reject) => {
    if (token == undefined) {
      resolve({});
    } else {
      admin.auth().verifyIdToken(token, true)
          .then( (results) => {
            resolve(results);
          })
          .catch( (error) => {
            console.log(error);
            resolve({});
          });
    }
  });

  return resultVerify;
}

module.exports = app;
