var express = require("express");
fs = require("fs");
var { makeNote,getObjectByType } = require("./neo4jQueries.js");
var router = express.Router();
// app.use(express.json());


// for testing
router.get("/", async function(req, res) {
  // req.query get twitter username
  let tdata = fs.readFileSync("./tweets/ctowannotated.json", "utf8", function(
    err,
    data
  ) {
    if (err) {
      return console.log(err);
    }
    return data;
  });
  // print(typeof data)
  console.log(typeof tdata);
  let tweets = JSON.parse(tdata);
  console.log(typeof tweets);
  console.log(Object.keys(tweets).length);
  // array of json
  // console.log(tweets[0]);
  for (i = 0; i < Object.keys(tweets).length; i++) {
    // {title, text, username, datecreated, tags: []}
    // let labels = (tweets[i].labels).map(function(entry) { return entry.replace(/_/g, ' '); });

    let note = {
      title: '',
      text: tweets[i].full_text,
      dateupdated: Date.now(),
      datecreated: tweets[i].created_at,
      tags: tweets[i].labels,
      link: (typeof tweets[i].link === 'undefined') ?  '' : tweets[i].link,
      type: (typeof tweets[i].type === 'undefined') ?  'tweet' : tweets[i].type
    };
    await makeNote(note, "con");
  }
  res.json({ message: "API is accessible" });
});


router.get("/getTweets", function(req, res) {
  console.log(req.token);
  getObjectByType("con", 'tweet').then(records => {
    arrayofnodes = [];
    records.forEach(record => {
      arrayofnodes.push({
        id: record.get(0).toNumber(),
        title: record.get(1),
        text: record.get(2),
        tags: record.get(3),
        link: record.get(4)
      });
    });
    res.status(200).json({ message: "search completed", tweets: arrayofnodes });
  });
});


//writing to a file
// let data = JSON.stringify(student);
// fs.writeFileSync('student-2.json', data);

module.exports = router;
