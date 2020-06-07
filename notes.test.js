"use strict";

const supertest = require("supertest");
const {app} = require("./server.js");
const request = supertest(app);
/*
testing with user: testaccount
*/
const myBeverage = {
  delicious: true,
  sour: false,
};

describe('my beverage', () => {
  test('is delicious', () => {
    expect(myBeverage.delicious).toBeTruthy();
  });

  test('is not sour', () => {
    expect(myBeverage.sour).toBeFalsy();
  });
});


describe("Test /makenote endpoint", function() {
  test(`tests that empty password is rejected`, async (t) => {
    const res = await request
      .post("/notesapp/makenote")
      .set('Authorization','Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3RhY2NvdW50IiwiYXV0aGVudGljYXRlZCI6dHJ1ZSwiZXhwIjoxNzExMjY0MzQ2fQ.fCvTOfzAehTPJdvJXtPRWw2V5FmQU0IUlM363NKfaec')
      // .set('content-type','application/json')
      .send({type: 'title', note: { title: "startups", text: "are fun", tags: ['one', 'two', 'three'], datecreated: Date.now()} })
      .expect(201);

    expect(res.body).toHaveProperty("message");
    t();
    // expect(res.body.noteid).toBeGreaterThan(8);
  });

  test('failure', async (done) => {
    const res = await request
      .post("/notesapp/makenote")
      .set('Authorization','Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3RhY2NvdW50IiwiYXV0aGVudGljYXRlZCI6dHJ1ZSwiZXhwIjoxNzExMjY0MzQ2fQ.fCvTOfzAehTPJdvJXtPRWw2V5FmQU0IUlM363NKfaec')
      // .set('content-type','application/json')
      .send({type: 'title', note: {text: "are fun", tags: ['one', 'two', 'three'], datecreated: Date.now()} })
      .expect(400);
    expect(res.body).toHaveProperty("error");
    done();
  });
});

// close connection to the database
afterAll(async () => {
  const {driver} = require('./server.js');
  return driver.close();
});
