var express = require("express");
var app = express();
var nJwt = require("njwt");
var fs = require("fs");
var cors = require("cors");
const path = require('path')
//functions
var { makeNote, editNote, getObjectByType, getTagsForNote, getTags, exportData} = require("./neo4jQueries.js");
// models
var Node = require("./Node.js");
// Database
const neo4j = require("neo4j-driver");

var driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "qwe-34-vo")
);



// comparing the note to last save and updating the changes
async function editNoteClose(){

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
async function getPathWeights2(username, type) {
  tagscount = {};
  tagApperanceSum = 0
  let tags = await getTags(username,type)
    .then(tags => {
      tagsarray = [];
      tags.forEach(tag => tagsarray.push(tag.get(0)));
      tags.forEach(tag => {
        tagscount[tag.get(0)] = tag.get(1).toNumber();
        tagApperanceSum = tagApperanceSum + tag.get(1).toNumber()
      }
      );
      return tagsarray;
    })
    .catch(err => {
      console.log(err.toString());
    });
  let pathsweightsdict = {};
  var total = 0
  var max =  Math.ceil(tags.length / 100)
  var filter = 0
  if(tags.length > 300){
    max = 4
    // console.log(tagApperanceSum / tags.length);
    filter = Math.floor(tagApperanceSum / tags.length)
    if (filter > 8){
            filter = 8
    }

  }
  // await the array of promises
  for (let i = 0; i < max; i++) {
    await Promise.all(
      tags.slice(i * 100, 100 * (i + 1)).map(async tag => {
        // console.log(tagscount[tag]);
        // if tagcount[tag] < 1 , dont run query
        if( tagscount[tag] > filter){
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
            results.records.forEach((item, index) => {
              if (
                pathsweightsdict[results.records[index].get(1) + "][" +results.records[index].get(0)]
              ) {
                pathsweightsdict[
                  results.records[index].get(1) + "][" + results.records[index].get(0)] += results.records[index].get(2).toNumber();
              } else {
                pathsweightsdict[
                  results.records[index].get(0) +  "][" +  results.records[index].get(1)] = results.records[index].get(2).toNumber();
              }
              total = total + results.records[index].get(2).toNumber();
            });
          })
          .catch(error => {
            session.close();
            throw error;
          });
        }
      })
    );
  }
  return {'weights': pathsweightsdict, 'count': Object.keys(pathsweightsdict).length  , 'sum': total, 'tagsLength': tags.length};
}


async function getRelated(username, tag){
  var session = driver.session();
  return session
    .run(  "MATCH (n:Tag {tag: $tag, username: $username})-[r:MENTIONED_IN*2]-(t2:Tag {username: $username}) RETURN distinct(t2.tag)", {
      username: username,
      tag: tag
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

// get all title of notes associated with a username
function getTitles(username) {
  var session = driver.session();
  return session
    .run("MATCH (n:Note) WHERE n.username = {username} OPTIONAL MATCH (n)-[:TALKS_ABOUT]->(tags) RETURN id(n), n.title, n.text, collect(tags.tag), n.link, n.dateupdated", {
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
     MATCH (p)-[:TALKS_ABOUT]->(tags) RETURN id(p), p.title, p.text, tags.tag, p.link",
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
// CALL db.index.fulltext.createNodeIndex('smartSearch',['Note','Tag'],['tag','title','text','link'])
// if returns tags get the notes associated with those tags
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
  "http://localhost:3000", //this is my front-end url for development
  "http://thenubes.ddns.net",
  "https://thenubes.ddns.net"
];
var corsOptions = {
  origin: function(origin, callback) {
    if (originsWhitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
  // credentials: true
   // Access-Control-Allow-Credentials is what credentials configures
};

let secretKey = "super secert key";
const AuthMiddleWare = (req, res, next) => {
  let key;
// && !!req.get('user-Agent').match(/Mozilla/)
  if (typeof req.headers.authorization === "undefined"  ){
//     {
//   "authorized": true,
//   "authenticated": false,
//   "username" : 'con'.
//   "exp": 1711264346
// }
    key =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdXRob3JpemVkIjp0cnVlLCJhdXRoZW50aWNhdGVkIjpmYWxzZSwiZXhwIjoxNzExMjY0MzQ2fQ.2Frw89KWy8YJglqTk6uQ4e_W6WXWZv-d79unHi3vCGA";
  }
  else if (typeof req.headers.authorization === "undefined" ){
    key = ''
  }
  else{
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
app.options("*", cors( corsOptions ));
app.use(AuthMiddleWare);
app.use("/notesapp", router);
app.use('/tweet', require('./tweet.js'));

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




// user can edit text, tags, or title of THEIR note ... conflicts resolved by dateupdated
router.put("/editnote/:id", (req, res) => {
  if (req.token.authenticated && (req.token.username === req.body.user)) {
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
    searchNotesTag({ tag: req.query.lookupField, username: req.query.user })
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
              tags: [record.get(3)],
              link: record.get(4),
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
 } else {
    smartSearch({ term: req.query.lookupField, username: req.query.user })
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


// get list of all possible tags for a user, need to query the user ?user=' '
router.get("/getTagsList", (req, res) => {
  if (req.token.authorized) {
    getTags(req.query.user, req.query.type)
      .then(tags => {
        tagsarray = [];
        tagscount = {};
        tagApperanceSum = 0
        tags.forEach(tag => tagsarray.push(tag.get(0)));
        tags.forEach(tag => {
          tagscount[tag.get(0)] = tag.get(1).toNumber()
          tagApperanceSum = tagApperanceSum + tag.get(1).toNumber()
        });
        res.status(200).json({ tags: tagsarray, tagsCount: tagscount, tagSum: tagApperanceSum});
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "not authorized for this resource" });
  }
});


// get list of all possible note titles for a user
router.get("/getTitlesList", (req, res) => {
  if (req.token.authorized) {
    getTitles(req.query.user)
      .then(titles => {
        titlearray = [];
        titles.forEach(title => titlearray.push({id: title.get(0).toNumber(), title: title.get(1) ,text:  title.get(2), tags:  title.get(3), date: title.get(5)}));
        res.status(200).json({ titles: titlearray });
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "not authorized for this resource" });
  }

});

// get all blogs for a user, query user=* *
router.get("/getBlogs", (req, res) => {
  if (req.token.authorized) {
    getObjectByType(req.query.user, 'blog')
      .then(records => {
        blogarray = [];
        records.forEach(record => {
          blogarray.push({
            id: record.get(0).toNumber(),
            title: record.get(1),
            text: record.get(2),
            tags: record.get(3),
            link: record.get(4)
          });
        });
        res.status(200).json({ blogs: blogarray });
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "not authorized for this resource" });
  }

});

// get the weights between the paths of tags
router.get("/getPathWeights", (req, res) => {
  if (req.token.authorized) {
    getPathWeights2(req.query.user, req.query.type)
      .then(results => {
        res.status(200).json({ weights: results.weights, edgeSum: results.sum , edgeCount: results.count, tagsLength: results.tagsLength });
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "not authorized for this resource" });
  }
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

// get related topics to a tag
router.get("/getRelated", (req, res) => {
  if (req.token.authorized) {
    getRelated(req.query.user, req.query.tag)
    .then(results => {
      tagsarray = [];
      results.forEach(record => tagsarray.push(record.get(0)));
      res.status(200).json({ tags: tagsarray });
    })
    .catch(err => {
      res.status(400).json({ error: err.toString() });
    });
  } else {
    res.status(401).json({ error: "not authorized for this resource" });
  }

});

// router.get("/getNotebyID", (req, res) => {
//     get(req.token.username, req.query.tag)
//     .then(results => {
//       tagsarray = [];
//       results.forEach(record => tagsarray.push(record.get(0)));
//       res.status(200).json({ tags: tagsarray });
//     })
//     .catch(err => {
//       res.status(400).json({ error: err.toString() });
//     });
// });

// user wants to delete a note
router.delete("/deletenote/:id", (req, res) => {
  if (req.token.authenticated && (req.token.username === req.body.user)) {
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

// for testing
router.get('/', function(req, res) {
  res.json({ message: 'API is accessible' });
});

// for testing
router.get('/export', function(req, res) {
  if (req.token.authenticated) {
    exportData(req.token.username)
      .then(records => {
        recordsarray = [];
        records.forEach(record => {
          recordsarray.push({
            id: record.get(0).toNumber(),
            title: record.get(1),
            text: record.get(2),
            tags: record.get(3),
            link: record.get(4),
            ownership: record.get(5),
            type: record.get(6)
          });
        });
        res.status(200).json({ data: recordsarray });
      })
      .catch(err => {
        res.status(400).json({ error: err.toString() });
      });
  } else {
    res.status(401).json({ error: "must sign in to export you data" });
  }
});

// testing inference
router.get("/getInference", function(req, res) {
  // req.token.username
  if ( req.token.authorized && req.query.text !== "") {
    let thetext = req.query.text
    if((req.query.text).length > 270){
      thetext = thetext.substring(0,270)
    }
    // may have to use full python3 path /usr/bin/python3?
    const spawn = require("child_process").spawn;
    const pythonProcess = spawn("python3", [
      path.join(__dirname, "/ML_pipeline_train/inference.py"),
      "realtime",
      thetext
    ]);
    pythonProcess.stdout.on("data", data => {
      // Do something with the data returned from python script
      console.log(data.toString());
      let thetags = [
        ...new Set(data.toString().replace("\n", "").replace(/\s/g, '').replace("_", " ").replace("<|endoftext|>", "").split(","))
      ];
      thetags = thetags.filter(function(e) {
        return e !== " " && e !== '';
      });
      console.log(thetags);
      res.status(200).json({ tags: thetags });
    });
    pythonProcess.on("error", function() {
      console.log("Failed to start child.");
    });
    pythonProcess.on("exit", function(code) {
      console.log("Exited with code " + code);
    });
  } else {
    res.status(401).json({ error: "text cannot be blank / unauthorized" });
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
