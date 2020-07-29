import json, os, requests, base64
from secerts import consumer_key,consumer_secret
from datetime import date
from requests_oauthlib import OAuth1Session
from pathlib import Path
# print("Usage: python tl_CNN_test.py <Path to CNN Model>")
# screenname = input('enter twitter user handle: ')

# ---- getting user timeline tweets (retweets?)
url = "https://api.twitter.com/oauth2/token"
s = consumer_key + ":" + consumer_secret
base64s = (base64.b64encode(s.encode('utf-8'))).decode('utf-8')
headers = {'Authorization': "Basic " + base64s, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
data ={"grant_type" : "client_credentials"}
x = requests.post(url, data = data, headers = headers)
print(x.content)
test = (x.content).decode('utf-8')
test2 = json.loads(test)
print(test2['access_token'])
ttoken = test2['access_token']
base64s2 = (base64.b64encode(ttoken.encode('utf-8'))).decode('utf-8')
params = { 'Authorization': 'Bearer ' + ttoken}
# x2 = requests.get('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=eriktorenberg', headers = params).json()
# print(x2.__dict__)
# print(x2)
# print(vars(x2))
# AAAAAAAAAAAAAAAAAAAAAMu39AAAAAAAGMnHMatWp76egWsg1oI6mZyzqx8%3DtBhBacva77Y7p37z0flCJnCXNzejBGQD9ODrzCVfJyAUjcAHl4

# https://api.twitter.com/1.1/favorites/list.json --- favorites
screenname = 'sfurshy'
filename = screenname + '_' + date.today().strftime("%Y%m%d-%H%M%S")
# file = Path(filename)
# file.touch(exist_ok=True)

maxid = ''
count = 0
while count < 100:
    response = ''
    if maxid is '':
        response = requests.get('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name='+ screenname+'&tweet_mode=extended&count=200', headers = params).json()
    else:
        response = requests.get('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name='+ screenname+'&max_id='+ maxid+'&tweet_mode=extended&count=200', headers = params).json()

    # print(response)
    print(len(response))
    print(response[-1]['id_str'])
    print(maxid)
    print (response[-1]['id_str'] ==  maxid)
    if response[-1]['id_str'] == maxid:
        print('done')
        count = 100
    maxid = response[-1]['id_str']
    try:
        with open('./tweets/' + filename + '.json', 'r') as f:
            try:
                list2= json.load(f)
            except:
                list2 = []
                print('errpr')
    except:
        list2 = []
        pass
    dict2 = response+list2
    mode = 'a' if os.path.exists('./tweets/' + filename + '.json') else 'w+'
    with open('./tweets/' + filename + '.json', 'w+') as f2:
        json.dump(dict2, f2)
    count += 1

# -----FULL ARCHIVE------------
# bearer token
# curl -u '<API key>:<API secret key>' \
#   --data 'grant_type=client_credentials' \
#   'https://api.twitter.com/oauth2/token'
#
# searching tweets in full archive by username
# endpoint = "https://api.twitter.com/1.1/tweets/search/fullarchive/testfull.json"
# data = '{"query":"from:eriktorenberg", "fromDate": "200802020000", "toDate": "201707270000", "maxResults":"100"}'
# fullarchres = requests.post(endpoint,data=data,headers=params).json()
