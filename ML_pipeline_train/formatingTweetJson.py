import json, os, base64, sys, requests
from llist import sllist
import sys
import re
from pathlib import Path
from datetime import date
# 2 directories up
p = Path(os.path.abspath(__file__)).parents[1]
# adding note_server to pythonpaths so i can import .py modules from there
sys.path.insert(0,str(p))
from secerts import consumer_key,consumer_secret

# how to use
# arg 1 (extract or label)
# sys.argv[1]
#sys.argv[2]
DIR = '../tweets/'
FILENAME = 'erikmaster.json'
# FILENAME = 'eriktorenberg_20200727-000000.json'
THREADS = FILENAME.split('.')[0] + '_threads.json'
EXTRACTED = FILENAME.split('.')[0] + '_extracted.json'
LABELED = FILENAME.split('.')[0] + '_labeled.json'
LABELED2 = FILENAME.split('.')[0] + '_labeled2.json'

def extract(FILENAME, DIR, EXTRACTED):
        # extracting the important features from raw twitter text
        # opening files
        with open(DIR + FILENAME) as f:
          data = json.load(f)

        # variables
        alltxt = []
        extractedList = []
        jsondict = {}
        # building dictionary
        for index, entry in enumerate(data):
            alltxt = alltxt + [{'full_text': entry['full_text']}]
            jsondict.update({entry['id']:entry})

        # building threads
        # entry['user']['screen_name']
        threads = []
        threadmap = {}
        for index, entry in enumerate(data):
            parent = entry['in_reply_to_status_id']
            temp_in_reply_user = entry['in_reply_to_user_id']
            curr = entry['id']
            #  and temp_in_reply_user == 18989355
            while parent != None:
                try:
                    # building thread map start -> end of thread
                    if threadmap.get(parent) == None and threadmap.get(curr) == None :
                        tempslst = sllist([parent, curr])
                        threadmap.update({parent: tempslst})
                        threadmap.update({curr: tempslst })
                    elif threadmap.get(parent) == None and threadmap.get(curr) != None :
                        tempslst = threadmap.get(curr)
                        pos = None
                        for index,value in enumerate(tempslst):
                            if value == curr:
                                pos = index
                                break;
                        tempslst.insertbefore(parent,tempslst.nodeat(pos))
                        threadmap.update({parent: tempslst})
                        threadmap.update({curr: tempslst })
                    # elif threadmap.get(parent) != None and threadmap.get(curr) == None :
                    #     print('thiscase')
                    # else:
                    #     print('final case no cover')
                    curr = parent
                    parent = (jsondict[parent])['in_reply_to_status_id']
                    temp_in_reply_user = (jsondict[parent])['in_reply_to_user_id']
                except KeyError:
                    parent = None
                    temp_in_reply_user = 0


        unithreads = set(threadmap.values())
        for thread in unithreads:
            first = thread.first.value
            tempthread = ''
            while True:
                try:
                    n = thread.popleft()
                    tempthread = tempthread + (jsondict[n])['full_text']
                    jsondict.pop(n)
                except:
                    if tempthread != '':
                        threads = threads + [{'thread': tempthread}]
                        extractedList.append({'full_text' : tempthread, 'tweetID': first})
                    break

        # put all threads into a file
        # threadfile = open(DIR + THREADS,"w+")
        # json.dump(threads ,threadfile)


        for key in jsondict:
            extractedList.append({'full_text' : jsondict[key]['full_text'] ,'tweetID':  jsondict[key]['id']})
        extracted = open(DIR + EXTRACTED,"w+")
        json.dump(extractedList ,extracted)

# merges the tweets collected at various dates into one file (the base or truth)
def merge(USERNAME, DIR, OUTPUTFILE):
    regex = re.compile(USERNAME + '_\d{8}-000000.json')
    mergefiles = list(filter(regex.search,  os.listdir(DIR)))

    list2 = []
    for file in mergefiles:
        with open(DIR + file, 'r') as f:
            try:
                list2 = list2 + json.load(f)
            except:
                print('error in merging')
    # filter out duplicate tweets by id
    newlist = {v['id']:v for v in list2}.values()
    annotated = open(DIR + OUTPUTFILE ,"w+")
    json.dump(list(newlist) ,annotated)

def inferencedStrToArray(DIR, LABELED, LABELED2):
    # turning inferenced labels strings into array
    with open(DIR + LABELED) as f:
      data = json.load(f)
    # final = [re.sub(r"[^a-zA-Z0-9]+", ' ', k) for k in a.split("\n")]
    annotated = open(DIR + LABELED2,"w+")
    alltxt = []
    for index, entry in enumerate(data):
        # labels = list(set(entry['labels'].encode('unicode-escape').decode("utf-8", "strict").replace(' ','').replace('<|endoftext|>', '') \
        # .replace(']','').replace(r'\u','_').replace('/','').replace(':','').replace('.','') \
        # .replace('-','').replace('#','').replace('\'','').replace('|','').replace('\\','') \
        # .replace('&','').replace(';','').replace('[','').replace('(','').replace(')','') \
        # .replace('?','').replace('\"','').replaceAll("[^.,a-zA-Z]").split(',')))
        edited = entry['labels'].replace('<|endoftext|>', '')
        labels = list(set(re.sub(r"[^a-zA-Z0-9]+", '', x) for x in edited.split(',')))
        while("" in labels) :
            labels.remove("")
        alltxt = alltxt + [{'full_text': entry['full_text'], 'labels': labels}]

    json.dump(alltxt ,annotated)


#function for getting a users timeline tweets
def gatherTweets(username, DIR):
    url = "https://api.twitter.com/oauth2/token"
    s = consumer_key + ":" + consumer_secret
    base64s = (base64.b64encode(s.encode('utf-8'))).decode('utf-8')
    headers = {'Authorization': "Basic " + base64s, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
    data ={"grant_type" : "client_credentials"}
    x = requests.post(url, data = data, headers = headers)
    test = (x.content).decode('utf-8')
    test2 = json.loads(test)
    ttoken = test2['access_token']
    base64s2 = (base64.b64encode(ttoken.encode('utf-8'))).decode('utf-8')
    params = { 'Authorization': 'Bearer ' + ttoken}

    screenname = username
    filename = screenname + '_' + date.today().strftime("%Y%m%d-%H%M%S")

    maxid = ''
    count = 0
    while count < 100:
        response = ''
        if maxid is '':
            response = requests.get('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name='+ screenname+'&tweet_mode=extended&count=200', headers = params).json()
        else:
            response = requests.get('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name='+ screenname+'&max_id='+ maxid+'&tweet_mode=extended&count=200', headers = params).json()

        if response[-1]['id_str'] == maxid:
            print('done ' + username)
            count = 100
        maxid = response[-1]['id_str']
        try:
            with open(DIR + filename + '.json', 'r') as f:
                try:
                    list2= json.load(f)
                except:
                    list2 = []
                    print('errpr')
        except:
            list2 = []
            pass
        dict2 = response+list2
        with open( DIR + filename + '.json', 'w+') as f2:
            json.dump(dict2, f2)
        count += 1
