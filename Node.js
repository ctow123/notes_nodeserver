
function Node(thenode) {
  let result = {};
  result['id'] = thenode.identity.low;
  // var obj = JSON.parse(thenode.properties)
  console.log(thenode.properties);
  let props = thenode.properties
  for(var key in thenode.properties){
    result[key] = props[key];
  }
  // result['title'] = thenode.properties.title;
  // result['text'] = thenode.properties.text;
  // result['username'] = thenode.properties.username;
  return result;
}

module.exports = Node;
