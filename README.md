# notes_nodeserver


The is the nodeJS server that interfaces with the Neo4J graph database for my notes app.

API specs
/notes
1) make, edit, delete a note
2) retrieve notes, tags, connections for user notes

/tweets
link twitter username to account scrap and auto - tag tweets


## PLANNER API

**Method**: `GET`

**Authorization HEADER**: `tokenID required`

**URL**: `/userCourses?userID=xxxx`

**RESPONSE**
```json
{
  "data": [{
      "id": "5uDo8mno7CaoqNKAXn9W",
      "subject": "CS",
      "uid": "SfRmF6x5exSTQtd6LFae6IYFnUm2",
      "subjectCourse": "CS3214",
      "courseTitle": "Intro to Comp Org II",
      "credits": 3,
      "year": "2",
      "term": "09"
    }, {}, {}],
  "msg":"search successful"
}
```
_________________________
