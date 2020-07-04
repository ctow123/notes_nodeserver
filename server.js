var http = require("http");
var url = require("url");
var express = require("express");
var app = express();
var nJwt = require("njwt");
var fs = require("fs");
var cors = require("cors");
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
    "CREATE (n:Note {title: $title, text: $text, username: $username, datecreated: $date, dateupdated: $date})"
  );
  params.title = note.title;
  params.text = note.text;
  params.username = username;
  params.date = Date.now();
  for (let i = 0; i < note.tags.length; i++) {
    await getTag(note.tags[i], username).then(result => {
      if (result.exists) {
        query.push("WITH n");
        query.push(
          "MATCH (" +
            note.tags[i].replace(/ /g,'') +
            ":Tag) WHERE " +
            note.tags[i].replace(/ /g,'') +
            ".tag in {tag" +
            i +
            "} AND " +
            note.tags[i].replace(/ /g,'') +
            ".username = $username"
        );
        query.push("CREATE (n)-[:TALKS_ABOUT]->(" + note.tags[i].replace(/ /g,'') + ")");
        query.push("CREATE (" + note.tags[i].replace(/ /g,'') + ")-[:MENTIONED_IN]->(n)");
        params["tag" + i] = note.tags[i];
      } else {
        query.push(
          "CREATE (" +
            note.tags[i].replace(/ /g,'') +
            ":Tag {tag: $tag" +
            i +
            ", username: $username})"
        );
        query.push(
          "CREATE (n)-[:TALKS_ABOUT]->(" + note.tags[i].replace(/ /g,'') + ")"
        );
        query.push(
          "CREATE (" + note.tags[i].replace(/ /g,'') + ")-[:MENTIONED_IN]->(n)"
        );
        params["tag" + i] = note.tags[i];
        tags.push("t" + i);
      }
    });
  }
  query.push("RETURN id(n)");

  return session
    .run(query.join(" "), params)
    .then(result => {
      session.close();
      // console.log(result.records[0].get(0).toNumber());
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

// edit the title, text, or tags of a note
// returns a promise on success it will have stats
/*     var stats = {
      updateTags: updateTags,
      firstquery: "",
      secondquery: "",
      firstqueryparams: "",
      secondqueryparams: "",
      updateStats
    };
*/
async function editNote(type, id, note, username) {
  let add;
  let remove;
  if (type === "title") {
    var session = driver.session();
    let stats = await session
      .run(
        "MATCH (n:Note) WHERE id(n)={noteid} SET n.title = $title RETURN n",
        {
          noteid: parseInt(id),
          title: note.title
        }
      )
      .then(result => {
        session.close();
        return result;
      })
      .catch(error => {
        session.close();
        throw error;
      });
    return stats.summary.updateStatistics;
  } else if (type === "text") {
    var session = driver.session();
    let stats = await session
      .run("MATCH (n:Note) WHERE id(n)={noteid} SET n.text = $text RETURN n", {
        noteid: parseInt(id),
        text: note.text
      })
      .then(result => {
        session.close();
        return result;
      })
      .catch(error => {
        session.close();
        throw error;
      });
    return stats.summary.updateStatistics;
  } else if (type === "tag") {
    let updateTags = await getTagsForNote(id, username)
      .then(oldtags => {
        let newtags = note.tags;
        remove = oldtags.filter(x => !newtags.includes(x));
        add = newtags.filter(x => !oldtags.includes(x));
        return { remove: remove, add: add };
      })
      .catch(err => {
        throw err;
      });
    // console.log(updateTags);
    var stats = {
      updateTags: updateTags,
      firstquery: "",
      secondquery: "",
      firstqueryparams: "",
      secondqueryparams: ""
    };
    var query = [];
    var params = {};
    params["username"] = username;
    params["id"] = parseInt(id);

    for (let [i, item] of updateTags.remove.entries()) {
      try {
        query.push(
          "MATCH (n:Note {username: $username}) WHERE id(n)={id} MATCH (n)-[rel]-(p:Tag {tag: $tag" +
            i +
            ", username: $username}) DELETE rel"
        );
        if (i < updateTags.remove.length - 1) {
          query.push("WITH true as pass");
        }
        params["tag" + i] = item;
      } catch (error) {
        console.log("error " + error);
      }
    }
    stats.firstquery = query;
    stats.firstqueryparams = params;
    if (query.length != 0) {
      var session = driver.session();
      session
        .run(query.join(" "), params)
        .then(result => {
          session.close();
          stats.updateStats = Object.assign(
            {},
            result.summary.updateStatistics._stats
          );
        })
        .catch(error => {
          session.close();
          throw error;
        });
    }
    // adding tags
    query = [];
    params = {};
    params["username"] = username;
    params["id"] = parseInt(id);

    for (let [i, item] of updateTags.add.entries()) {
      try {
        let num = i + updateTags.remove.length;
        let tag = await getTag(item, username);
        if (tag.exists) {
          query.push(
            "MATCH (a:Note),(b:Tag) WHERE id(a)={id} AND id(b)=$tagnum" +
              num +
              " WITH a,b CREATE (a)-[:TALKS_ABOUT]->(b) CREATE (b)-[:MENTIONED_IN]->(a)"
          );
          if (i < updateTags.add.length - 1) {
            query.push("WITH true as pass");
          }
          params["tag" + num] = item;
          params["tagnum" + num] = tag.idnum;
        } else {
          query.push(
            "CREATE (" +
              "tag" +
              num +
              ":Tag {tag: $tag" +
              num +
              ", username: $username})"
          );
          query.push("WITH tag" + num);
          query.push("MATCH (n:Note {username: $username}) WHERE id(n)={id}");
          query.push("CREATE (n)-[:TALKS_ABOUT]->(tag" + num + ")");
          query.push("CREATE (tag" + num + ")-[:MENTIONED_IN]->(n)");
          if (i < updateTags.add.length - 1) {
            query.push("WITH true as pass");
          }
          params["tag" + num] = item;
        }
      } catch (error) {
        console.log("error" + error);
      }
    }
    stats.secondquery = query;
    stats.secondqueryparams = params;
    if (query.length != 0) {
      var session = driver.session();
      session
        .run(query.join(" "), params)
        .then(result => {
          session.close();
          for (key in result.summary.updateStatistics._stats) {
            if (
              typeof stats.updateStats !== "undefined" &&
              key in stats.updateStats
            ) {
              stats.updateStats[key] =
                stats.updateStats[key] +
                result.summary.updateStatistics._stats[key];
            }
          }
        })
        .catch(error => {
          session.close();
          throw error;
        });
    }
    // console.log(stats);
    return stats;
  }
}


// comparing the note to last save and updating the changes
async function editNoteClose(){

}

// get all tags assocaited with a note for a user
function getTagsForNote(noteid, username) {
  var session = driver.session();
  return session
    .run(
      "MATCH (n:Note {username: $username}) WHERE id(n)={id} MATCH (n)-[rel:TALKS_ABOUT]-(p:Tag) RETURN p.tag",
      { id: parseInt(noteid), username: username }
    )
    .then(result => {
      session.close();
      let tagsarray = [];
      result.records.forEach(record => {
        tagsarray.push(record.get(0));
      });
      return tagsarray;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

// tag should be a string
function getTag(tag, username) {
  var session = driver.session();
  return session
    .run(
      "MATCH (a:Tag) WHERE a.tag in {tag} AND a.username = {username} RETURN id(a)",
      { tag: tag, username: username }
    )
    .then(result => {
      session.close();
      // console.log("getTag results ", result.records[0].get(0).toNumber());
      if (result.records.length >= 1) {
        return { exists: true, idnum: result.records[0].get(0).toNumber() };
      } else {
        return { exists: false };
      }
    })
    .catch(error => {
      session.close();
      throw error;
    });
}

// get all tags associated with a username, and number of times each tag is mentioned
function getTags(username) {
  var session = driver.session();
  return session
    .run("MATCH (n:Tag) WHERE n.username = {username} WITH n MATCH (n)-[r:MENTIONED_IN]->() RETURN n.tag, COUNT(r)", {
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

function pairwise(list) {
  if (list.length < 2) {
    return [];
  }
  var first = list[0],
    rest = list.slice(1),
    pairs = rest.map(function(x) {
      return [first, x];
    });
  return pairs.concat(pairwise(rest));
}

// get the weights for the paths between tag nodes
// getPathWeights rewrite for speed
async function getPathWeights2(username){
  let tags = await getTags(username)
    .then(tags => {
      tagsarray = [];
      tags.forEach(tag => tagsarray.push(tag.get(0)));
      return tagsarray;
    })
    .catch(err => {
      console.log(err.toString());
    });
  let pathsweights = [];
  let pathsweightsdict = {}
  // await the array of promises
    await Promise.all(tags.map(async (tag) => {
        var session = driver.session();
      await session
        .run(
          "MATCH (n:Tag {tag: $pairone, username: $username})-[r:MENTIONED_IN*2]-(t2:Tag {username: $username}) RETURN n.tag,t2.tag, count(r)",
          {
          pairone: tag,
          username: username
          }
        )
        .then(results => {
          session.close();
          (results.records).forEach( (item, index) => {
            if(pathsweightsdict[results.records[index].get(1) + '][' + results.records[index].get(0)]){
              pathsweightsdict[results.records[index].get(1) + '][' + results.records[index].get(0)] += results.records[index].get(2).toNumber()
            }
            else{
            pathsweightsdict[results.records[index].get(0) + '][' + results.records[index].get(1)] = results.records[index].get(2).toNumber()
          }
          })
        })
        .catch(error => {
          session.close();
          throw error;
        });
    }))
    return [pathsweightsdict]
}

// get all title of notes associated with a username
function getTitles(username) {
  var session = driver.session();
  return session
    .run("MATCH (n:Note) WHERE n.username = {username} RETURN n.title, n.dateupdated", {
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

// implements search using neo4j's fulltext indexing
function smartSearch(query){
  var session = driver.session();
  return session
    .run(
      "CALL db.index.fulltext.queryNodes('smartSearch', {term}) YIELD node, score \
       WITH node, score \
       MATCH (n:Note {username: {username}}) WHERE id(n)=id(node) MATCH (n)-[rel:TALKS_ABOUT]-(p:Tag) \
       RETURN id(node), node.title, node.text, collect(p.tag) as tags, score",
      {
        term: query.term,
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

// recommend tags for a note based on tags that notes sharing its current tags talk about
async function recommendedTags(id, username){
  var session = driver.session();
  let results = await session
    .run("MATCH (n:Note {username: {username}}) WHERE ID(n)={noteid} WITH n MATCH (n)-[:TALKS_ABOUT*3]-(t2:Tag) \
         RETURN distinct(t2.tag)", {
      noteid: parseInt(id),
      username: username
    })
    .then(result => {
      session.close();
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
  return  results;
}

async function deleteNote(id){
  var session = driver.session();
  let stats = await session
    .run("MATCH (n:Note) WHERE id(n)={noteid} DETACH DELETE n", {
      noteid: parseInt(id),
    })
    .then(result => {
      session.close();
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
  return  stats.summary.updateStatistics;
}

//  ---------- custom middleware create & cors
var originsWhitelist = [
  "http://localhost:3000" //this is my front-end url for development
];
var corsOptions = {
  origin: function(origin, callback) {
    console.log("hi", origin);
    if (originsWhitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

let secretKey = "super secert key";
const AuthMiddleWare = (req, res, next) => {
  let key;
  if (typeof req.headers.authorization === "undefined") {
    key =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImNvbiIsImF1dGhlbnRpY2F0ZWQiOmZhbHNlLCJleHAiOjE3MTEyNjQzNDZ9.Wyvk3K-nmax4PDRS2yb35VhFunpsyMy8xTVVEvUwEqg";
  } else {
    key = req.headers.authorization.split(" ")[1];
  }
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  nJwt.verify(key, secretKey, function(err, token) {
    if (err) {
      console.log(err);
      res.status(400).json({ error: "authorization required" });
    } else {
      req.token = token.body;
      next();
    }
  });
};
// ------- methods ----
var router = express.Router();
app.use(express.json());
app.options("*", cors({ corsOptions }));
app.use(AuthMiddleWare);
app.use("/notesapp", router);

// notes routes, all require auth
// create a note adnd returns the id of the created note to user or error message
router.post("/makenote", (req, res) => {
  if (req.token.authenticated) {
    makeNote(req.body.note, req.token.username)
      .then(results => {
        let str = Date.now().toString() + " ";
        req.token.username +
          " " +
          results.records[0].get(0).toNumber() +
          " " +
          req.body.note +
          " ";
        JSON.stringify(results.summary.updateStatistics._stats) + "\n";
        fs.appendFile("noteMakeLog.txt", str, function(err) {
          if (err) {
            console.log(err);
          }
        });
        res.status(201).json({
          message: "note created",
          noteid: results.records[0].get(0).toNumber()
        });
      })
      .catch(err => {
        console.log(err);
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "must sign in to create a note" });
  }
});




// user can edit text, tags, or title of their note ... conflicts resolved by dateupdated
router.put("/editnote/:id", (req, res) => {
  if (req.token.authenticated) {
    let stats = editNote(
      req.body.type,
      req.params.id,
      req.body.note,
      req.token.username
    )
      .then(r => {
        let str =
          Date.now().toString() +
          " " +
          req.token.username +
          " " +
          req.body.type +
          " " +
          JSON.stringify(r) +
          "\n";
        fs.appendFile("noteEditLog.txt", str, function(err) {
          if (err) {
            console.log(err);
          }
        });
        res.status(200).json({ message: "edit complete" });
      })
      .catch(err => {
        res.status(400).json({ message: err.toString() });
      });
  } else {
    res.status(401).json({ error: "must sign in to edit a note" });
  }
});
// retrieve all notes specificed by params {lookupBy, lookupField}
// lookupBy: title, tag (only supported), date & lookupField: input
// longerterm input a word/phrase and intelligently search by all of the above
//  search by text of doc
// curl localhost:8100/searchnotes?lookupBy=tag&lookupField=startup
router.get("/searchnotes", (req, res) => {
  console.log(req.query);
  if (req.query.lookupBy === "tag") {
    searchNotesTag({ tag: req.query.lookupField, username: req.token.username })
      .then(records => {
        dictofnodes = {};
        records.forEach(record => {
          // if record/ note exists add to its array of tags
          if (dictofnodes[record.get(0).toString()]) {
            dictofnodes[record.get(0).toString()].tags.push(record.get(3));
          } else {
            dictofnodes[record.get(0).toString()] = {
              id: record.get(0).toNumber(),
              title: record.get(1),
              text: record.get(2),
              tags: [record.get(3)]
            };
          }
        });
        arrayofnodes = [];
        for (let key in dictofnodes) {
          arrayofnodes.push(dictofnodes[key]);
        }
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
    smartSearch({ term: req.query.lookupField, username: req.token.username })
      .then(records => {
        arrayofnodes = [];
        records.forEach(record => {
          arrayofnodes.push({
            id: record.get(0).toNumber(),
            title: record.get(1),
            text: record.get(2),
            tags: record.get(3),
            score: record.get(4)
          });
        });
        res.status(200).json({ message: "search completed" , notes: arrayofnodes});
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  }
});


// get list of all possible tags for a user
router.get("/getTagsList", (req, res) => {
  let user = typeof req.query.username !== "undefined" ? req.query.username : req.token.username
  getTags(user)
    .then(tags => {
      tagsarray = [];
      tagscount = {};
      tags.forEach(tag => tagsarray.push(tag.get(0)));
      tags.forEach(tag => tagscount[tag.get(0)] = tag.get(1).toNumber())
      res.status(200).json({ tags: tagsarray, tagsCount: tagscount });
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
});

// get list of all possible note titles for a user
router.get("/getTitlesList", (req, res) => {
  getTitles(req.token.username)
    .then(titles => {
      titlearray = [];
      titles.forEach(title => titlearray.push({title: title.get(0), date: title.get(1)}));
      res.status(200).json({ titles: titlearray });
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
});

// get the weights between the paths of tags
router.get("/getPathWeights", (req, res) => {
  let user = typeof req.query.username !== "undefined" ? req.query.username : req.token.username
  getPathWeights2(user)
    .then(weights => {
      res.status(200).json({ weights: weights });
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
});

// get recommended tags for a note you make
router.get("/getRecommendTags", (req, res) => {
    recommendedTags(req.query.id, req.token.username)
    .then(results => {
      console.log(results.records);
      tagsarray = [];
      results.records.forEach(record => tagsarray.push(record.get(0)));
      res.status(200).json({ tags: tagsarray });
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
});

// user wants to delete a note
router.delete("/deletenote/:id", (req, res) => {
  console.log(req.body);
  if (req.token.authenticated) {
    deleteNote(req.params.id)
      .then(result => {
        res.status(200).json({ message: result });
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "must sign in to delete a note" });
  }
});


const PORT = 8100;
const HOST = "0.0.0.0";

// disable this line when testing
app.listen(PORT, () =>
  console.log(`Example app listening at http://${HOST}:${PORT}`)
);

module.exports = {
  app: app,
  driver: driver
}
