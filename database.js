/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
const sql = require('mssql');

const {Log} = require('./log');

const Logger = new Log();

class Dbase {
  static dbaseCon = {
    user: 'root1',
    password: '',
    server: '',
    database: 'icydb',
  };

  static dataCache = [];
  static request;
  static async processQuery(qResult) {
    return qResult.recordset;
  }

  static async cacheData() {
    const sqlData = `
    SELECT venue.venueID, venue.name, venue.status, CONVERT(varchar, venue.openTime, 8) AS "openTime", CONVERT(varchar, venue.closeTime, 8) AS "closeTime", venue.rating, venue.numberOfPeople, address.street, address.city, address.province, address.country, coordinate.latitude, coordinate.longitude
      FROM ((( venue
      INNER JOIN location ON venue.locationID = location.locationID)
      INNER JOIN address ON location.addressID = address.addressID)
      INNER JOIN coordinate ON location.coordinateID = coordinate.coordinateID);
    `;

    const sqlAmmenityData = `
    SELECT amenities.venueID, rinkAmenities.amenity
      FROM (rinkAmenities
      INNER JOIN amenities ON rinkAmenities.rinkAmenityID = amenities.rinkAmenityID);
    `;

    const sqlScheduleData = `
    SELECT schedule.venueID, events.name AS "event", DATENAME(weekday, CAST(schedule.startTime AS datetime)) AS "startDay", CONVERT(varchar, schedule.startTime, 8) AS "startTime", DATENAME(weekday, CAST(schedule.endTime AS datetime)) AS "endDay", CONVERT(varchar, schedule.endTime, 8) AS "endTime"
      FROM (schedule
      INNER JOIN events ON events.eventID = schedule.eventID)
      ORDER BY
        schedule.startTime;
    `;

    let resultForData = await new Promise((resolve, reject) => {
      sql.connect(Dbase.dbaseCon, (err) => {
        const request = new sql.Request();
        request.query(sqlData, (err, results) => {
          if (err) {
            throw err;
          }
          resolve(results);
        });
      });
    });

    const resultForAmenities = await new Promise((resolve, reject) => {
      sql.connect(Dbase.dbaseCon, (err) => {
        const request = new sql.Request();
        request.query(sqlAmmenityData, (err, results) => {
          if (err) {
            throw err;
          }
          resolve(results);
        });
      });
    });

    const resultForSchedule = await new Promise((resolve, reject) => {
      sql.connect(Dbase.dbaseCon, (err) => {
        const request = new sql.Request();
        request.query(sqlScheduleData, (err, results) => {
          if (err) {
            throw err;
          }
          resolve(results);
        });
      });
    });

    const amenitiesProcessed = await this.processQuery(resultForAmenities);
    const scheduleProcessed = await this.processQuery(resultForSchedule);
    resultForData = await this.processQuery(resultForData);

    for (let i = 0; i < resultForData.length; i++) {
      resultForData[i].amenities = [];
      resultForData[i].schedule = [];

      amenitiesProcessed.forEach((element) => {
        if (element.venueID == resultForData[i].venueID) {
          resultForData[i].amenities.push(element.amenity);
        }
      });

      scheduleProcessed.forEach((element) => {
        if (element.venueID == resultForData[i].venueID) {
          resultForData[i].schedule.push(element);
        }
      });
    }

    this.dataCache = resultForData;

    Logger.logger.info('Data cache executed');
    return;
  }

  static insertRink(rink) {
    Logger.logger.info('Attempt to insert rink (feature disabled)');

    // const sql = `INSERT INTO rinks (rName, longitude, latitude) VALUES ("${rink.name}", ${rink.longitude}, ${rink.latitude});`;
    /* this.dbaseCon.query(sql, (err, result) => {
      if (err) {
        throw err;
      }
    });*/
  }

  static async updateNumPeople(number, id) {
    // Simply run command to update value
    const command = `UPDATE venue
    SET numberOfPeople = numberOfPeople + ${number}
    WHERE venueID = ${id} AND numberOfPeople + ${number} >= 0`;

    const result = await new Promise((resolve, reject) => {
      sql.connect(Dbase.dbaseCon, (err) => {
        const request = new sql.Request();
        request.query(command, (err, results) => {
          if (err) {
            throw err;
          }
          resolve(results);
        });
      });
    });

    // Returns true if number rows affected is not 0 (indicates that numberOfPeople was updated)
    // Returns false if number rows affected is 0 (indicates that numberOfPeople was not updated as would go below 0 or ID is wrong)
    if (result.rowsAffected[0] > 0) {
      Logger.logger.info(`numberOfPeople for: venue #${id} UPDATED to add ${number} people`);
      return true;
    } else {
      Logger.logger.error(`numberOfPeople for: venue #${id} NOT UPDATED as data (${number}) decremented below 0 or ID was incorrect`);
      return false;
    }
  }

  static deleteFromRink(id) {
    Logger.logger.info('Attempt to delete rink (feature disabled)');

    // const sql = `DELETE FROM rinks WHERE id=${id};`;
    /* this.dbaseCon.query(sql, (err, result) => {
      if (err) {
        throw err;
      }
    });*/
  }

  static async insertReport(report) {
    const insertReportQuery = 'INSERT INTO dbo.report(timeStamp, venueID, condition, inUse, hockeyGame, skaters) VALUES (convert(datetime,\''+ report.time +'\',20), ' + report.venueID + ', ' + report.condition + ', ' + (report.inUse == true ? '1' : '0') + ', ' + (report.hockeyGame == true ? '1' : '0') + ', ' + report.skaters + '); ';

    return await new Promise((resolve, reject) => {
      sql.connect(Dbase.dbaseCon, (err) => {
        if (err) {
          Logger.logger.error('Database connection failed');
          return;
        }
        const request = new sql.Request();
        request.query(insertReportQuery, (err, results) => {
          if (err) {
            throw err;
          }
          resolve(results);
        });
      });
    });
  }

  static async getUserRoles(UID) {
    const query = `SELECT userRoles.UID, userRoles.userType, userTypes.description
    FROM (dbo.userRoles
    INNER JOIN dbo.userTypes ON dbo.userRoles.userType = dbo.userTypes.userType)
    WHERE userRoles.UID = '${UID}';`;

    let resultForData = await new Promise((resolve, reject) => {
      sql.connect(Dbase.dbaseCon, (err) => {
        const request = new sql.Request();
        request.query(query, (err, results) => {
          if (err) {
            throw err;
          }
          resolve(results);
        });
      });
    });

    resultForData = await this.processQuery(resultForData);

    return resultForData;
  }
}

module.exports = {Dbase};
