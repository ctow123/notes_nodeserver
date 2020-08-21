var express = require("express");
fs = require("fs");
var { makeNote,getObjectByType } = require("./neo4jQueries.js");
var router = express.Router();

// upload a users labeled file into the DB
// query requires filename & user
router.get("/uploadfile", async function(req, res) {
  // console.log(req.query.filename);
    if (req.token.admin) {
  if (typeof req.query.filename !== 'undefined' && typeof req.query.user !== 'undefined'){
  let tdata = fs.readFileSync("./tweets/" + req.query.filename + ".json", "utf8", function(
    err,
    data
  ) {
    if (err) {
      return console.log(err);
    }
    return data;
  });
  console.log(typeof tdata);
  let tweets = JSON.parse(tdata);
  console.log(typeof tweets);
  console.log(Object.keys(tweets).length);
  // array of json
  for (i = 0; i < Object.keys(tweets).length; i++) {
    // {title, text, username, datecreated, tags: []}
    // labels in format ['label1','label2']
    let labels = (tweets[i].labels).map(function(entry) { return entry.replace(/_/g, ' '); });
    // console.log(labels);

    let note = {
      title: (typeof tweets[i].title === 'undefined') ?  '' : tweets[i].title,
      text: tweets[i].full_text,
      dateupdated: Date.now(),
      datecreated: (typeof tweets[i].created_at === 'undefined') ?  Date.now() : tweets[i].created_at,
      tags: labels,
      link: (typeof tweets[i].link === 'undefined') ?  '' : tweets[i].link,
      type: (typeof tweets[i].type === 'undefined') ?  'tweet' : tweets[i].type
    };
    await makeNote(note, req.query.user);
  }
  console.log(req.query.filename + ' created');
  res.status(200).json({ message: "created" });
}
else{
    res.status(400).json({ error: "invalid query params" });
}
} else {
  res.status(401).json({ error: "must be an admint to start file uploads" });
}
});


router.get("/getTweets", function(req, res) {
  if (req.token.authorized) {
    getObjectByType(req.query.user, 'tweet').then(records => {
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
  } else {
    res.status(401).json({ error: "not authorized for this resource" });
  }

});


//writing to a file
// let data = JSON.stringify(student);
// fs.writeFileSync('student-2.json', data);

module.exports = router;
