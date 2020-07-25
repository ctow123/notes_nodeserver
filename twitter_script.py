import json

from secerts import consumer_key,consumer_secret

import os
from requests_oauthlib import OAuth1Session
import requests
import base64
# # Get request token
# request_token_url = "https://api.twitter.com/oauth/request_token"
# oauth = OAuth1Session(consumer_key, client_secret=consumer_secret)
# fetch_response = oauth.fetch_request_token(request_token_url)
# resource_owner_key = fetch_response.get('oauth_token')
# resource_owner_secret = fetch_response.get('oauth_token_secret')
# print("Got OAuth token: %s" % resource_owner_key)
#
# # Get authorization
# base_authorization_url = 'https://api.twitter.com/oauth/authorize'
# authorization_url = oauth.authorization_url(base_authorization_url)
# print('Please go here and authorize: %s' % authorization_url)
# verifier = input('Paste the PIN here: ')
#
# # Get the access token
# access_token_url = 'https://api.twitter.com/oauth/access_token'
# oauth = OAuth1Session(consumer_key,
#                      client_secret=consumer_secret,
#                      resource_owner_key=resource_owner_key,
#                      resource_owner_secret=resource_owner_secret,
#                      verifier=verifier)
# oauth_tokens = oauth.fetch_access_token(access_token_url)
#
# access_token = oauth_tokens['oauth_token']
# access_token_secret = oauth_tokens['oauth_token_secret']

# Make the request

# print("Usage: python tl_CNN_test.py <Path to CNN Model>")
# screenname = input('enter twitter user handle: ')
# max_id = input('enter id of oldest tweet: ')


# oauth = OAuth1Session(client_id=consumer_key, ,
#                        client_secret=consumer_secret,
#                        resource_owner_key=access_token,
#                        resource_owner_secret=access_token_secret)


# ---- getting user timeline tweets (retweets?)
url = "https://api.twitter.com/oauth2/token"
s = consumer_key + ":" + consumer_secret
# message_bytes = message.encode('ascii')
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
headers2 = {'Authorization': 'Bearer ' + base64s2}
params = { 'Authorization': 'Bearer ' + ttoken}
x2 = requests.get('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=eriktorenberg', headers = params)
# print(x2.__dict__)
print(x2)
# print(vars(x2))
# AAAAAAAAAAAAAAAAAAAAAMu39AAAAAAAGMnHMatWp76egWsg1oI6mZyzqx8%3DtBhBacva77Y7p37z0flCJnCXNzejBGQD9ODrzCVfJyAUjcAHl4

# name = input('Paste the PIN here: ')
# screenname = ''
# maxid = ''
# count = 0
# while count < 100:
#     params = {}
#     if maxid is '':
#         params = {"screen_name": "eriktorenberg", "count": "200",  "tweet_mode":"extended"}
#     else:
#         params = {"screen_name": "eriktorenberg", "count": "200", "tweet_mode":"extended", "max_id" : maxid}
#     response = oauth.get("https://api.twitter.com/1.1/statuses/user_timeline.json", params = params)
#     dictdata = json.loads(response.text)
#     print(len(dictdata))
#     print(dictdata[-1]['id_str'])
#     print(maxid)
#     print (dictdata[-1]['id_str'] ==  maxid)
#     if dictdata[-1]['id_str'] == maxid:
#         print('done')
#         count = 100
#     maxid = dictdata[-1]['id_str']
#     try:
#         with open('./tweets/test.json', 'r') as f:
#             try:
#                 list2= json.load(f)
#             except:
#                 list2 = []
#                 print('errpr')
#     except:
#         list2 = []
#         pass
#     dict2 = dictdata+list2
#     with open('./tweets/test.json', 'w+') as f2:
#         json.dump(dict2, f2)
#     count += 1
# # -----------------------------------------------------------------------
# # Loop through each of the results, and print its content.
# # -----------------------------------------------------------------------
#
# with open('furshtweet2.json', 'w+') as f:
#     json.dump(dict2, f)

# with open('tweet.json') as f:
#   data = json.load(f)
# dictdata = json.loads(data)
# # Output: {'name': 'Bob', 'languages': ['English', 'Fench']}
# print(dictdata[0]['text'])

# with open('tweetREALson.json', 'w+') as f:
#     json.dump(dictdata, f)

# -----NEW_------------
# bearer token
# curl -u '<API key>:<API secret key>' \
#   --data 'grant_type=client_credentials' \
#   'https://api.twitter.com/oauth2/token'
#
# endpoint = "https://api.twitter.com/1.1/tweets/search/fullarchive/testfull.json"
#
# headers = {"Authorization":"Bearer AAAAAAAAAAAAAAAAAAAAAMu39AAAAAAAGMnHMatWp76egWsg1oI6mZyzqx8%3DtBhBacva77Y7p37z0flCJnCXNzejBGQD9ODrzCVfJyAUjcAHl4", "Content-Type": "application/json"}
#
# data = '{"query":"biotech", "fromDate": "201802020000", "toDate": "201802240000", "maxResults":"20"}'
#
# response = requests.post(endpoint,data=data,headers=headers).json()
# print(response)
