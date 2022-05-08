const request = require('supertest');
const app = require('./server');

describe('GET /locations', () => {
  test('RESPONSE 200: Can get location data for venueID 1', async () => {
    const response = await request(app)
        .get('/locations')
        .query({venueID: 1});
    expect(response.statusCode).toBe(200);
    expect(response.body[0].name).toBe('Timberlane Park Rink');
  });
});

describe('GET /locations', () => {
  test('RESPONSE 200: Can get location data for city: Cambridge', async () => {
    const response = await request(app)
        .get('/locations')
        .query({city: 'Cambridge'});
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(6);
  });
});

describe('GET /locations', () => {
  // eslint-disable-next-line max-len
  test('RESPONSE 200: Can get location data for city: Cambridge, sorted alphabetically', async () => {
    const response = await request(app)
        .get('/locations')
        .query({
          city: 'Cambridge',
          sort: 'AZ',
        });
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(6);
    expect(response.body[0].name).toBe('Angewood Park Outdoor Rink');
  });
});

describe('GET /locations', () => {
  // eslint-disable-next-line max-len
  test('RESPONSE 200: Can get location data for city: Cambridge, sorted reverse alphabetically', async () => {
    const response = await request(app)
        .get('/locations')
        .query({
          city: 'Cambridge',
          sort: 'ZA',
        });
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(6);
    expect(response.body[5].name).toBe('Angewood Park Outdoor Rink');
  });
});

describe('GET /locations', () => {
  // eslint-disable-next-line max-len
  test('RESPONSE 200: Can get location data for specified coordinates within 8km distance range', async () => {
    const response = await request(app)
        .get('/locations')
        .query({
          long: -80.28724392367874,
          lat: 43.33868292969606,
          dist: 8,
        });
    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(4);
    expect(response.body[0].name).toBe('Domm Park Outdoor Rink');
  });
});

describe('GET /locations', () => {
  test('RESPONSE 404: No venue can be found for improper ID', async () => {
    const response = await request(app)
        .get('/locations')
        .query({venueID: -1});
    expect(response.statusCode).toBe(404);
  });
});

describe('GET /locations', () => {
  test('RESPONSE 404: No venue can be found for city: Kurflupflup',
      async () => {
        const response = await request(app)
            .get('/locations')
            .query({city: 'Kurflupflup'});
        expect(response.statusCode).toBe(404);
      });
});

describe('POST /userRole', () => {
  test('RESPONSE 200: Can get role for user: itQNczXlrEb1nNkHz3Y3nK9roXd2',
      async () => {
        const response = await request(app)
            .post('/userRole')
            .send(
                {
                  UID: 'itQNczXlrEb1nNkHz3Y3nK9roXd2',
                },
            );
        expect(response.statusCode).toBe(200);
        expect(response.body[0].userType).toBe(2);
      });
});

describe('POST /userRole', () => {
  test('RESPONSE 400: When improper UID given',
      async () => {
        const response = await request(app)
            .post('/userRole')
            .send(
                {
                  UID: 'i',
                },
            );
        expect(response.statusCode).toBe(400);
      });
});

describe('GET /reports', () => {
  test('RESPONSE 404: No reports for venueID 1, should return 404',
      async () => {
        const response = await request(app)
            .get('/reports')
            .query({venueID: 1});
        expect(response.statusCode).toBe(404);
      });
});
