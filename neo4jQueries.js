const neo4j = require("neo4j-driver");

var driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "qwe-34-vo")
);
//list of neo4j queries
/*

*/

/* makes note, note requires data in json in the form {title, text, username, datecreated, tags: []}
--> adding type to notes
will autosend date created / updated
 */
async function makeNote(note, username) {
  var session = driver.session();
  var query = [];
  var params = {};
  var tags = [];
  query.push(
    "CREATE (n:Note {title: $title, text: $text, username: $username, link: $link, datecreated: $date, dateupdated: $date, type: $type, public: true, ownership: true})"
  );
  params.type = note.type
  params.link = note.link;
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
            note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") +
            ":Tag) WHERE " +
            note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") +
            ".tag in {tag" +
            i +
            "} AND " +
            note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") +
            ".username = $username"
        );
        query.push("CREATE (n)-[:TALKS_ABOUT]->(" + note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") + ")");
        query.push("CREATE (" + note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") + ")-[:MENTIONED_IN]->(n)");
        params["tag" + i] = note.tags[i];
      } else {
        query.push(
          "CREATE (" +
            note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") +
            ":Tag {tag: $tag" +
            i +
            ", username: $username})"
        );
        query.push(
          "CREATE (n)-[:TALKS_ABOUT]->(" + note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") + ")"
        );
        query.push(
          "CREATE (" + note.tags[i].replace(/ /g,'').replace(/[0-9]/g, "X") + ")-[:MENTIONED_IN]->(n)"
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

/*
edit the title, text, or tags of a note
 returns a promise on success it will have stats
 var stats = {
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
  else if (type === "link"){
    var session = driver.session();
    let stats = await session
      .run("MATCH (n:Note) WHERE id(n)={noteid} SET n.link = $link RETURN n", {
        noteid: parseInt(id),
        link: note.link
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
  }
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

// returns all object by type (tweet, blog, note, video) for a user
function getObjectByType(username, type) {
  var session = driver.session();
  return session
    .run(
      "MATCH (a:Note) WHERE a.type = {type} AND a.username = {username} OPTIONAL MATCH (a)-[:TALKS_ABOUT]->(tags) RETURN id(a), a.title, a.text, collect(tags.tag), a.link",
      { type: type, username: username }
    )
    .then(results => {
      session.close();
      return results.records;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}
// ---------------------------------------- TWEETS RELATED QUERIES ----------------------------

// ---------------------------------------- BLOG RELATED QUERIES ----------------------------

module.exports= {
  makeNote: makeNote,
  getObjectByType: getObjectByType,
  editNote: editNote,
  getTagsForNote: getTagsForNote,
  getTags: getTags,
  
};
