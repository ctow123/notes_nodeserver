var http = require("http");
var url = require("url");
var express = require("express");
var app = express();
var nJwt = require("njwt");
// var _ = require('lodash');
// Database
// var Movie = require('./models/Movie');
const neo4j = require("neo4j-driver");

var driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "qwe-34-vo")
);

// makes note, note requires data in json in the form {title, text, username, tags: []}
// need to add date created field, date modified field
async function makeNote(note) {
  var session = driver.session();
  var query = [];
  var params = {};
  var tags = [];
  query.push(
    "CREATE (" +
      note.title +
      ":Note {title: $title, text: $text, username: $username})"
  );
  params.title = note.title;
  params.text = note.text;
  params.username = note.username;
  for (let i = 0; i < note.tags.length; i++) {
    note.tags[i] = note.tags[i].substring(1);
    await getTag(note.tags[i]).then(result => {
      console.log(result);
      if (result) {
        query.push("WITH " + note.title + "");
        query.push(
          "MATCH (" +
            note.tags[i] +
            ":Tag) WHERE " +
            note.tags[i] +
            ".tag in {tag" +
            i +
            "}"
        );
        query.push(
          "CREATE (" + note.title + ")-[:TALKS_ABOUT]->(" + note.tags[i] + ")"
        );
        query.push(
          "CREATE (" + note.tags[i] + ")-[:MENTIONED_IN]->(" + note.title + ")"
        );
        params["tag" + i] = note.tags[i];
      } else {
        query.push("CREATE (" + note.tags[i] + ":Tag {tag: $tag" + i + "})");
        query.push(
          "CREATE (" + note.title + ")-[:TALKS_ABOUT]->(" + note.tags[i] + ")"
        );
        query.push(
          "CREATE (" + note.tags[i] + ")-[:MENTIONED_IN]->(" + note.title + ")"
        );
        params["tag" + i] = note.tags[i];
        tags.push("t" + i);
      }
    });
  }
  query.push("RETURN " + note.title);

  console.log(query);
  console.log(params);
  return session
    .run(query.join(" "), params)
    .then(result => {
      session.close();
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

// tag should be a string
function getTag(tag) {
  var session = driver.session();
  return session
    .run("MATCH (a:Tag) WHERE a.tag in {tag} RETURN a", { tag: tag })
    .then(result => {
      session.close();
      if (result.records.length >= 1) {
        return true;
      } else {
        return false;
      }
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

function getTags(tag) {
  var session = driver.session();
  return session
    .run("MATCH (n:Tag) RETURN n")
    .then(result => {
      session.close();
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

// the tag (string) to search notes by
function searchNotesTag(query) {
  var session = driver.session();
  // session.close will return a promise so returning session means this function returns a prommise
  return session
    .run(
      "MATCH (t:Tag {tag: {thetag}})-[:MENTIONED_IN]->(p) RETURN p",{thetag: query.tag}
    )
    .then(result => {
      session.close();
      console.log(result.records);
      return result.records;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

function search(param) {
  var query = param;
  searchNotes(query).then(movies => {
    console.log(movies);
  });
}
//  ---------- custom middleware create
const AuthMiddleWare = (req, res, next) => {
  nJwt.verify(req.body.accessToken, secretKey, function(err, token) {
    if (err) {
      // respond to request with error
          res.status(400).json({error: 'authorization required'})
    } else {
      // continue with the request
      next();
    }
  });
};
// ------- methods ----
app.use(express.json());
// app.use(AuthMiddleWare);

// notes routes, all require auth
// create a note, data will be json {title, text, username, tags: [string array]}
app.post("/makenote", (req, res) => {
  makeNote(req.body).then(results => {
    res.status(201).json({stats: results.summary.updateStatistics._stats, message: 'note created'})
    console.log(results.summary.updateStatistics._stats);
  }).catch(err => {
    res.status(400).json({error: err.toString()})
  });
});

// user can edit text, tags, or title of their note
app.put("/editnote/:id", (req, res) => {
  console.log(req.body);
  // makeNote();
  res.send("created note");
});

// retrieve all notes specificed by params {lookupBy, lookupField}
// lookupBy: title, tag, date, lookupField
app.get("/searchnotes", (req, res) => {

  searchNotesTag({tag: 'startup'}).then(results => {
    console.log(results);
  })
  res.send("created note");
});

// get list of all possible tags
app.get("/getTagsList", (req, res) => {
  getTags.then(tags => {
    console.log(tags);
    res.status(200)
    // .json({tags: tags})
  }).catch(err => {
    res.status(400).json({error: err.toString()})
  })
});

// user wants to delete a note
app.delete("/deletenote", (req, res) => {
  console.log(req.body);
  // makeNote();
  res.send("created note");
});

const PORT = 8100;
const HOST = "0.0.0.0";

// disable this line when testing
app.listen(PORT, () =>
  console.log(`Example app listening at http://${HOST}:${PORT}`)
);
module.exports = app;
