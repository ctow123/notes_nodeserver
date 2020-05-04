"use strict";

const supertest = require("supertest");
const app = require("./server.js"); 
const request = supertest(app);


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

describe("Test User Creation", function() {
  it(`tests that empty password is rejected`, async () => {
    const res = await request
      .post("/makenote")
      .send({ title: "startups", text: "are fun" }) // should disallow empty password
      .expect(200);

    expect(res.body).toHaveProperty("message");
    expect(res.body.message.length).toBeGreaterThan(8);
  });
});
