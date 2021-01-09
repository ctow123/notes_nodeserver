import json, os, base64, sys, requests
from llist import sllist
import sys
import re
from pathlib import Path
from datetime import date
from twitter_script import getUserID

"""
going 2 directories up to add notes_nodeserver to pythonpaths so i can import .py modules
from there
"""
p = Path(os.path.abspath(__file__)).parents[1]
sys.path.insert(0,str(p))
from secerts import consumer_key,consumer_secret

# how to use
# arg 1 (extract or label)
# sys.argv[1]
#sys.argv[2]
DIR = '../tweets/'
USERID = '1475495658'
# FILENAME = 'erikmaster.json'
# FILENAME = "micsolana_20210101-000000.json" search ][ and repalce with ,
FILENAME = 'eriktorenberg_20210103-000000.json'
THREADS = FILENAME.split('.')[0] + '_threads.json'
EXTRACTED = FILENAME.split('.')[0] + '_extracted.json'
LABELED = FILENAME.split('.')[0] + '_labeled.json'
LABELED2 = FILENAME.split('.')[0] + '_labeled2.json'

"""
puts all the tweets from a raw tweet file into a file with merged tweet threads, with tweet id of the first
tweet in the thread
PROOF LOGIC THREADS: 
"""
def extract(FILENAME, DIR, EXTRACTED):
        with open(DIR + FILENAME) as f:
          data = json.load(f)

        # variables
        # alltxt = []
        extractedList = []
        jsondict = {}
        # building dictionary
        for index, entry in enumerate(data):
            # alltxt = alltxt + [{'full_text': entry['full_text']}]
            jsondict.update({entry['id']:entry})

        # building threads
        # entry['user']['screen_name']
        threads = []
        threadmap = {}

        for index, entry in enumerate(data):
            # parent = in_reply_to_user_id
            # child = author_id
            # id, referenced_tweets.id
            try:
                x = list(filter(lambda item: item['type'] == 'replied_to', entry['referenced_tweets']))
                # print(x)
                parent = x[0]['id']
            # temp_in_reply_user = entry['in_reply_to_user_id']
                curr = entry['id']
                while parent != None:
                    try:
                        # building thread map start -> end of thread
                            if threadmap.get(parent) == None and threadmap.get(curr) == None:
                                tempslst = sllist([parent, curr])
                                threadmap.update({parent: tempslst})
                                threadmap.update({curr: tempslst})
                            elif threadmap.get(parent) == None and threadmap.get(curr) != None:
                                tempslst = threadmap.get(curr)
                                pos = None
                                for index,value in enumerate(tempslst):
                                    if value == curr:
                                        pos = index
                                        break;
                                tempslst.insertbefore(parent,tempslst.nodeat(pos))
                                for val in tempslst:
                                    threadmap.update({val: tempslst})
                            elif threadmap.get(parent) != None and threadmap.get(curr) == None:
                                tempslst = threadmap.get(parent)
                                # print('hi__', tempslst, curr)
                                # ^need to update the index of all elements in that list to point to new tempslst.
                                pos = None
                                for index,value in enumerate(tempslst):
                                    if value == parent:
                                        pos = index
                                        break;
                                # print(pos, entry['referenced_tweets'][0])
                                # print(type(pos))
                                # print(tempslst)
                                tempslst.insertafter(curr,tempslst.nodeat(pos))
                                # print('bye__', tempslst)
                                for val in tempslst:
                                    threadmap.update({val: tempslst})
                                # threadmap.update({parent: tempslst})
                                # threadmap.update({curr: tempslst })
                            curr = parent
                            x = list(filter(lambda item: item['type'] == 'replied_to', (jsondict[parent])['referenced_tweets']))
                            # print(x)
                            parent = x[0]['id']
                            # print("next___", curr, parent)
                            # parent = (jsondict[parent])['referenced_tweets'][0]['id']
                        # temp_in_reply_user = (jsondict[parent])['in_reply_to_user_id']
                    except (KeyError,IndexError) as e:
                        parent = None
                        # temp_in_reply_user = 0
            except (KeyError,IndexError) as e:
                continue

        # print(threadmap)
        unithreads = set(threadmap.values())

        print(unithreads)
        print(len(unithreads))
        # threads where jsondict[n] is blank bc its not a thread but reply
        for thread in unithreads:
            first = thread.first.value
            tempthread = ''
            while True:
                try:
                    n = thread.popleft()
                    tempthread = tempthread + (jsondict[n])['text'] + " "
                    # removing for dups
                    jsondict.pop(n)
                except:
                    if tempthread != '':
                        threads = threads + [{'thread': tempthread}]
                        extractedList.append({'text' : tempthread, 'tweetID': first})
                    break

        # put all threads into a file
        threadfile = open(DIR + THREADS,"w+")
        json.dump(threads ,threadfile)


        for key in jsondict:
            extractedList.append({'text' : jsondict[key]['text'] ,'tweetID':  jsondict[key]['id']})
        extracted = open(DIR + EXTRACTED,"w+")
        json.dump(extractedList ,extracted)



# converts tweet timeline data receieved from twitter 1.1 api to data received 2.0 api
def V1toV2(FILENAME, DIR, V2FILENAME):
    with open(DIR + FILENAME) as f:
        data = json.load(f)
     # variables
    v2data = []
    # building dictionary
    for index, entry in enumerate(data):
        if entry['in_reply_to_status_id_str'] != None:
            newentry = {'created_at': entry['created_at'], 'text': entry['full_text'], 'entities': {'mentions': entry['entities']['user_mentions']},
            'conversation_id' : entry['id'], 'id' : entry['id'], 'entities': {'urls': entry['entities']['urls']}, 'referenced_tweets' :{'type': 'replied_to', 'id': entry['in_reply_to_status_id_str']},
            'author_id' : entry['user']['id_str'], 'in_reply_to_user_id' : entry['in_reply_to_user_id_str'], 'public_metrics': {  "retweet_count": entry['retweet_count'],
            "reply_count": 0,"like_count": entry['favorite_count'],"quote_count": 0}
            }
        elif entry['retweet']:
            newentry = {'created_at': entry['created_at'], 'text': entry['full_text'], 'entities': {'mentions': entry['entities']['user_mentions']},
            'conversation_id' : entry['id'],'id' : entry['id'], 'entities': {'urls': entry['entities']['urls']}, 'referenced_tweets' :{'type': 'retweet', 'id': entry['in_reply_to_status_id_str']},
            'author_id' : entry['user']['id_str'], 'in_reply_to_user_id' : entry['in_reply_to_user_id_str'], 'public_metrics': {  "retweet_count": entry['retweet_count'],
            "reply_count": 0,"like_count": entry['favorite_count'],"quote_count": 0}
            }
        else:
            newentry = {'created_at': entry['created_at'], 'text': entry['full_text'], 'entities': {'mentions': entry['entities']['user_mentions']},
            'conversation_id' : entry['id'],'id' : entry['id'], 'entities': {'urls': entry['entities']['urls']}, 'referenced_tweets' :{},
            'author_id' : entry['user']['id_str'], 'in_reply_to_user_id' : entry['in_reply_to_user_id_str'], 'public_metrics': {  "retweet_count": entry['retweet_count'],
            "reply_count": 0,"like_count": entry['favorite_count'],"quote_count": 0}
            }
        v2data.append(newentry)
    with open(DIR + V2FILENAME) as f2:
        json.dump(f2, v2data)


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


# ---------------------------------------
# main method
def main():
    # x = getUserID('eriktorenberg')
    # # print(x)
    extract(FILENAME, DIR, EXTRACTED)
    with open(DIR + THREADS) as f2:
        data2 = json.load(f2)
        print(len(data2))
    with open(DIR + EXTRACTED) as f3:
        data2 = json.load(f3)
        print(len(data2))
    # if len(sys.argv) != 3:
    #     print("Usage: python3 twitter_script.py <twitter username> <options: [tweets, favorites]>")
    #     exit()
    # getBearer()
    # screenname = sys.argv[1]
    # favoritesfilename = screenname + '_favorites_' + date.today().strftime("%Y%m%d-%H%M%S")
    # filename = screenname + '_' + date.today().strftime("%Y%m%d-%H%M%S")
    # if sys.argv[2] == 'tweets':
    #     getTweets(screenname,filename)
    # elif sys.argv[2] == 'favorites':
    #     getFavorites(screenname,favoritesfilename)
    # else:
    #     print("Usage: python3 twitter_script.py <twitter username> <options: [tweets, favorites]>")
    #     exit()

if __name__ == "__main__":
    main()
