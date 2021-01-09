import json

filename = 'micsolana_20201231-000000'

with open('../tweets/' + filename + '.json', 'r') as f:
    list2= json.load(f)

print(len(list2))
print(type(list2[0]['created_at']))
