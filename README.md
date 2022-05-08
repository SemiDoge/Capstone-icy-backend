# Introduction 
This is the backend API Server.

Please Note: Pertinent information related to database and logging access credentials have been removed from this source for security purposes. This repo is intended for archival purposes, providing insight to the code I helped write for this project. 

## GET: /locations
Provides a JSON object of all venues in database.

## GET: /locations?key=__value__&sort=__
Provides a JSON object of venues based on the key value pair specified.
Example below: 

    /locations?city=Cambridge&amenities=HOCKEY&amenities=LIGHTS&amenities=BENCHES 
    
Returns rinks which are in Cambridge and have HOCKEY, LIGHTS, and BENCHES

### &sort=__
The valid values for sort are: 

    * AZ - Sort from A to Z.
    * ZA - Sort from Z to A.
    * BS - Sort distance from big to small.
    * SB - Sort distance from small to big.

Some examples:

Sort all rinks in Cambridge in reverse alphebetical order:

    /locations?city=Cambridge&sort=ZA
Sort all rinks in Cambridge by distance from Cambridge's town hall. Closest to furthest.

    /locations?city=Cambridge&long=-80.312&lat=43.360&sort=SB

### &long=__&lat=__
If longitude and latitude are included in the request. The respone output will include a 'distance' field. This field will contain the distance between the provided coordinates and rink included in the filter results.

Below is an example with of this behaviour with a query of: 

    locations/?city=Waterloo&long=-80.28&lat=43.34
- - -

    "venueID": 31,
        "name": "Regency Park",
            ...
        "latitude": 43.46042561,
        "longitude": -80.56053592,
        "amenities": [...],
        "schedule": [...],
        "distance": 25.89926315983903,
            ...

The resultant value for distance is saying that Regency Park is ~26km away from -80.28, 43.34.

## POST: /reports
__REQUIRES VALID AUTH TOKEN IN HEADER.__
Allows the front end to send information about ice conditions to the API.
Below describes the required report schema:

### Schema 

    venueID: NUMBER constrained to min(1) or max(65), is required
    condition: NUMBER constrained to min(0) or max(2), is required
    inUse: BOOLEAN, is required
    hockeyGame: BOOLEAN, is required
    skaters: NUMBER constrained to min(0) or max(15), is required

### Example following the above schema 

    {
        "venueID": 1,
        "condition": 0,
        "inUse": true,
        "hockeyGame": false,
        "skaters": 15
    }

## GET: /reports?venueID=__value__
Returns the latest report (if available) for the specified venue.

### Example report 

    {
        "time": "2022-02-28 13:47:11",
        "venueID": 1,
        "condition": 0,
        "inUse": true,
        "hockeyGame": false,
        "skaters": 15
    }

## POST: /peopleCount
__REQUIRES VALID AUTH TOKEN IN HEADER.__

Increments or decrements the numberOfPeople count for the venue as per the count stored in the database. Decrement below 0 will not work.

Below describes the required report schema:

### Schema 

    number: NUMBER, the count to add (+ num) or subtract (- num)
    id: NUMBER, the venueID for the specific count report

### Example following the above schema 

    {
        "number": 1,
        "id": 1
    }

## DELETE: /locations?loc=__value__ **(Currently unimplemented)**
If a rink ID is provided as __value__ then that rink will be deleted from the database.

## POST: /userRole
Provides a list of roles associated with the user.

### Schema

    UID: STRING of length 28, is required

### Example following the above schema 

    {
        "UID": "itQNczXlrEb1nNkHz3Y3nK9roXd2"
    }