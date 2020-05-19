// handles a record
function Node(record) {
  let result = {};
  console.log(record.keys);
  console.log(record);

  for(var key in record.keys){
    result[key] = record.get(key)
  }

  return result;
}

module.exports = Node;
