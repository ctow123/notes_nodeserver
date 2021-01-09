import json, os, requests, base64
from datetime import date
from requests_oauthlib import OAuth1Session
from pathlib import Path
import sys
import warnings
warnings.filterwarnings("ignore", category=SyntaxWarning)

"""
going 2 directories up to add notes_nodeserver to pythonpaths so i can import .py modules
from there
"""
p = Path(os.path.abspath(__file__)).parents[1]
sys.path.insert(0,str(p))
from secerts import consumer_key,consumer_secret

# GLOBALS
HEADERS = {'content-type': 'application/json'}

# generates the Oauth2 bearer token good for reads, Oauth1 sends requests on behalf of dev user
# Oauth 3-legged sends requests on behalf of other users
def getBearer():
    url = "https://api.twitter.com/oauth2/token"
    s = consumer_key + ":" + consumer_secret
    base64s = (base64.b64encode(s.encode('utf-8'))).decode('utf-8')
    headers = {'Authorization': "Basic " + base64s, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
    data ={"grant_type" : "client_credentials"}
    x = requests.post(url, data = data, headers = headers)
    # print(x.content)
    test = (x.content).decode('utf-8')
    test2 = json.loads(test)
    ttoken = test2['access_token']
    HEADERS['Authorization'] = 'Bearer ' + ttoken
    # HEADERS = { 'Authorization': 'Bearer ' + ttoken}

"""
This is using twitters api v1 to get a users liked tweets
https://api.twitter.com/1.1/favorites/list.json --- favorites
"""
def getFavorites(screenname, filename):
    maxid = ''
    count = 0
    while count < 100:
        response = ''
        if maxid == '':
            response = requests.get('https://api.twitter.com/1.1/favorites/list.json?screen_name='+ screenname+'&tweet_mode=extended&count=200', headers = HEADERS).json()
        else:
            response = requests.get('https://api.twitter.com/1.1/favorites/list.json?screen_name='+ screenname+'&max_id='+ maxid+'&tweet_mode=extended&count=200', headers = HEADERS).json()
        print(len(response))
        print(response[-1]['id_str'])
        print(maxid)
        print (response[-1]['id_str'] ==  maxid)
        if response[-1]['id_str'] == maxid:
            print('done')
            count = 100
        maxid = response[-1]['id_str']
        try:
            with open('../tweets/' + filename + '.json', 'r') as f:
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
        with open('../tweets/' + filename + '.json', 'w+') as f2:
            json.dump(dict2, f2)
        count += 1

"""
This is using twitters api v2 to get a users timeline tweets
according the the api you can get the 3200 most recent ones, need to get the id for
their usename first in v2

"""
def getUserID(username):
    getBearer()
    url = 'https://api.twitter.com/2/users/by/username/{}'.format(username)
    response = requests.request("GET", url, headers=HEADERS).json()
    # response {data: {id, username, name}}
    return response['data']['id']
def getTweets(username,filename):
    user_id = getUserID(username)
    url = "https://api.twitter.com/2/users/{}/tweets".format(user_id)
    params = {"tweet.fields": "attachments,author_id,context_annotations,conversation_id,created_at,entities,id,in_reply_to_user_id,lang,source,text,public_metrics",
    'max_results':'100', 'expansions': 'in_reply_to_user_id,referenced_tweets.id,entities.mentions.username,referenced_tweets.id.author_id', 'place.fields':'country'}
    # params = {'pagination_token':'7140dibdnow9c7btw3w2og08zbsdpx641ssyuyar7k6ya','max_results':'100'}
    response = requests.request("GET", url, headers=HEADERS, params=params).json()
    with open('../tweets/' + filename + '.json', 'a') as f2:
            json.dump(response['data'], f2)
    count = 0
    while 'next_token' in response["meta"]:
        b = 'Gathering' + "." * count
        print(b,end='\r')
        count += 1
        params['pagination_token'] = response["meta"]["next_token"]
        response = requests.request("GET", url, headers=HEADERS, params=params).json()
        # response['data'] may be null
        with open('../tweets/' + filename + '.json', 'a') as f2:
            try:
                json.dump(response['data'], f2)
            except:
                pass


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


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 twitter_script.py <twitter username> <options: [tweets, favorites]>")
        exit()
    getBearer()
    screenname = sys.argv[1]
    favoritesfilename = screenname + '_favorites_' + date.today().strftime("%Y%m%d-%H%M%S")
    filename = screenname + '_' + date.today().strftime("%Y%m%d-%H%M%S")
    if sys.argv[2] == 'tweets':
        getTweets(screenname,filename)
    elif sys.argv[2] == 'favorites':
        getFavorites(screenname,favoritesfilename)
    else:
        print("Usage: python3 twitter_script.py <twitter username> <options: [tweets, favorites]>")
        exit()

if __name__ == "__main__":
    main()
