import json
import os

# CHANGE THIS
FILENAME = 'eriktorenberg_20200727-000000'

DIR = '../tweets/'
TWEETS_FILE = DIR + FILENAME + '_extracted.json'
ANNOTATED_FILE = DIR + FILENAME + '_annotated.json'
SAVE_FILE = DIR + FILENAME+ '_save.txt'


# open file and load the json, this must exist
with open(TWEETS_FILE) as f:
  data = json.load(f)

print(len(data))
# file to write text and labels to for ML, created if doesn't exist, if it exist loads data
annotated= open(ANNOTATED_FILE,"a+")
annotated.seek(0)
dater = []
if os.stat(ANNOTATED_FILE).st_size != 0:
    dater = json.load(annotated)

# getting file save location
savelocation = 0
f2= None
if os.path.isfile(SAVE_FILE):
    f2= open(SAVE_FILE,"r+")
    data2 = f2.read()
    savelocation = int(data2)
else:
    f2= open(SAVE_FILE,"w+")

# cycle through all entries
for index, entry in enumerate(data[savelocation:]):
    print('\n')
    print("______________ the text _________")
    print(entry['full_text'])
    print("_________________________________")
    # for cateogory labels like star wars type either starwars or star_wars but be consistent
    print('enter the labels for this text seperated by spaces: (type `close` without quotes in input to save & quit)')
    x= input()
    if x == 'close':
        # save to annotated file
        annotated.seek(0)
        annotated.truncate()
        json.dump(dater,annotated)
        break
    else:
        # update save place
        f2.seek(0)
        f2.write(str(index+savelocation+1))
        f2.truncate()
        dater = dater + [{'full_text': entry['full_text'], 'labels': x.split()}]
