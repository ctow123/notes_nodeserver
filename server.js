var http = require("http");
var url = require("url");
var express = require("express");
var app = express();
var nJwt = require("njwt");
// var _ = require('lodash');
// Database
// models
var Node = require("./Node.js");
const neo4j = require("neo4j-driver");

var driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "qwe-34-vo")
);

/* makes note, note requires data in json in the form {title, text, username, datecreated, tags: []}
will autosend date created / updated
 */
async function makeNote(note, username) {
  var session = driver.session();
  var query = [];
  var params = {};
  var tags = [];
  query.push(
    "CREATE (" +
      note.title +
      ":Note {title: $title, text: $text, username: $username, datecreated: $date})"
  );
  params.title = note.title;
  params.text = note.text;
  params.username = username;
  params.date = Date.now();
  for (let i = 0; i < note.tags.length; i++) {
    note.tags[i] = note.tags[i].substring(1);
    await getTag(note.tags[i], username).then(result => {
      // console.log(result);
      if (result) {
        query.push("WITH " + note.title + "");
        query.push(
          "MATCH (" +note.tags[i] +":Tag) WHERE " +note.tags[i] + ".tag in {tag" +i +"} AND " + note.tags[i] +
            ".username = $username"
        );
        query.push(
          "CREATE (" + note.title + ")-[:TALKS_ABOUT]->(" + note.tags[i] + ")"
        );
        query.push(
          "CREATE (" + note.tags[i] + ")-[:MENTIONED_IN]->(" + note.title + ")"
        );
        params["tag" + i] = note.tags[i];
      } else {
        query.push(
          "CREATE (" +
            note.tags[i] +
            ":Tag {tag: $tag" +
            i +
            ", username: $username})"
        );
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
      console.log(result.records[0]._fields[0].low);
      console.log(result.records);
      for (let property in result.records[0]) {
        console.log(property);
        console.log(result.records[0][property]);
      }
      // console.log(result);
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

// edit the title, text, or tags of a note
function editNote(){
  // var session = driver.session();
  // return session
  //   .run(
  //     // MATCH (n:Note) WHERE id(n)=46 MATCH (n)-[rel:TALKS_ABOUT]-(p:Tag {tag:'node'}) Delete rel RETURN n,rel,p
  //     "",
  //     { tag: tag}
  //   )
  //   .then(result => {
  //     session.close();
  //     return result
  //   })
  //   .catch(error => {
  //     session.close();
  //     throw error;
  //   });
}

// get all tags assocaited with a note for a user
function getTagsForNote(noteid, username){

}

// tag should be a string
function getTag(tag, username) {
  var session = driver.session();
  return session
    .run(
      "MATCH (a:Tag) WHERE a.tag in {tag} AND a.username = {username} RETURN a",
      { tag: tag, username: username }
    )
    .then(result => {
      session.close();
      // console.log("getTag results ", result.records);
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

// get all tags associated with a username
function getTags(username) {
  var session = driver.session();
  return session
    .run("MATCH (n:Tag) WHERE n.username = {username} RETURN n.tag",{
      username: username
    })
    .then(result => {
      session.close();
      return result.records;
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
      "MATCH (t:Tag {tag: {thetag}})-[:MENTIONED_IN]->(p {username: {username}}) \
     MATCH (p)-[:TALKS_ABOUT]->(tags) RETURN id(p), p.title, p.text, tags.tag",
      {
        thetag: query.tag,
        username: query.username
      }
    )
    .then(result => {
      session.close();
      return result.records;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}


//  ---------- custom middleware create
let secretKey = "super secert key";
const AuthMiddleWare = (req, res, next) => {
  let key =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImNvbiIsImF1dGhlbnRpY2F0ZWQiOnRydWUsImV4cCI6MTU4OTkyMDQ4Nn0.1NkqZr_bhOpQ4-rDkckzJmUcmIevKMrhfsTpEfusCs0";

  nJwt.verify(key, secretKey, function(err, token) {
    // req.body.accessToken
    // console.log(req.body.access_token);
    if (err) {
      // respond to request with error
      console.log(err);
      res.status(400).json({ error: "authorization required" });
    } else {
      // continue with the request

      req.token = token.body;
      next();
    }
  });
};
// ------- methods ----
app.use(express.json());
app.use(AuthMiddleWare);

// notes routes, all require auth
// create a note, data will be json {title, text, username, tags: [string array]}
app.post("/makenote", (req, res) => {
  makeNote(req.body, req.token.username)
    .then(results => {
      res.status(201).json({
        stats: results.summary.updateStatistics._stats,
        message: "note created"
      });
      console.log(results.summary.updateStatistics._stats);
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
});

// user can edit text, tags, or title of their note
app.put("/editnote/:id", (req, res) => {
  console.log(req.params);
  console.log(req.body);
  // makeNote();
  // MATCH (s) WHERE id(s) = 39 return s
  res.send("created note");
});

// retrieve all notes specificed by params {lookupBy, lookupField}
// lookupBy: title, tag (only supported), date & lookupField: input
// longerterm input a word/phrase and intelligently search by all of the above
//  search by text of doc
// curl localhost:8100/searchnotes?lookupBy=tag&lookupField=startup
app.get("/searchnotes", (req, res) => {
  if (req.query.lookupBy === "tag") {
    searchNotesTag({ tag: req.query.lookupField, username: req.token.username })
      .then(records => {
        arrayofnodes = {};
        records.forEach(record => {
          if (arrayofnodes[record.get(0).toString()]) {
            arrayofnodes[record.get(0).toString()].tags.push(record.get(3));
          } else {
            arrayofnodes[record.get(0).toString()] = {
              id: record.get(0).toNumber(),
              title: record.get(1),
              text: record.get(2),
              tags: [record.get(3)]
            };
          }
        });
        // console.log(arrayofnodes);
        res
          .status(200)
          .json({ message: "search completed", notes: arrayofnodes });
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else if (req.query.lookupBy === "title") {
    res.status(200).json({ message: "note implemented yet" });
  } else if (req.query.lookupBy === "date") {
    res.status(200).json({ message: "search completed" });
  } else {
    // smart search
    res.status(200).json({ message: "search completed" });
  }
});

// get list of all possible tags for a user
app.get("/getTagsList", (req, res) => {
  getTags(req.token.username)
    .then(tags => {
      tagsarray = [];
      tags.forEach(tag => tagsarray.push(tag.get(0)));
      res.status(200).json({ tags: tagsarray });
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
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
