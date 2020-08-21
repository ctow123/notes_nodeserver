import json
import os
from llist import sllist
import sys
import re
# how to use
# arg 1 (extract or label)
# sys.argv[1]
#sys.argv[2]
DIR = '../tweets/'
FILENAME = 'micsolana_20200727-000000.json'
# FILENAME = 'eriktorenberg_20200727-000000.json'
THREADS = FILENAME.split('.')[0] + '_threads.json'
EXTRACTED = FILENAME.split('.')[0] + '_extracted.json'
LABELED = FILENAME.split('.')[0] + '_labeled.json'
LABELED2 = FILENAME.split('.')[0] + '_labeled2.json'

if sys.argv[1] == 'extract':
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
                gparent = (jsondict[parent])['in_reply_to_status_id']
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
                # elif threadmap.get(parent) != None and threadmap.get(curr) == None :
                #     print('thiscase')
                # else:
                #     print('final case no cover')
                curr = parent
                parent = gparent
                temp_in_reply_user = (jsondict[parent])['in_reply_to_user_id']
            except KeyError:
                parent = None
                temp_in_reply_user = 0


    # print(threadmap[1227293827859271681])
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
                threads = threads + [{'thread': tempthread}]
                extractedList.append({'full_text' : tempthread, 'tweetID': first})
                break

    # put all threads into a file
    # threadfile = open(DIR + THREADS,"w+")
    # json.dump(threads ,threadfile)


    for key in jsondict:
        extractedList.append({'full_text' : jsondict[key]['full_text'] ,'tweetID':  jsondict[key]['id']})
    # for thread in threads:
    #     extractedList.append({'full_text' : thread['thread']})
    extracted = open(DIR + EXTRACTED,"w+")
    json.dump(extractedList ,extracted)

else:
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
