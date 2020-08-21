import json
import os
from datetime import date
# covering labeled data to data that GPT2 can be trained on
# FIXME: gpt2 has max sequence of 1024 so have to make sure length w/ labels is less
DIR = '../tweets/'
SAVE_FILE = DIR +  date.today().strftime("%Y%m%d-%H%M%S") + '_traindata.txt'

print(list(filter(lambda x: '_annotated' in x,  os.listdir(DIR))))
trainfiles = list(filter(lambda x: '_annotated' in x,  os.listdir(DIR)))
list2 = []
for file in trainfiles:
    with open(DIR + file, 'r') as f:
        try:
            list2 = list2 + json.load(f)
        except:
            print('error')

# print(type(list2))
# print(list2[0])
print(len(list2))

with open(DIR + SAVE_FILE, 'w+') as f2:
    for tweet in list2:
        label_sentence = ''
        for index,label in enumerate(tweet['labels']):
            if index < len(tweet['labels']) -1:
                label_sentence += (label + ', ')
            else:
                label_sentence += (label)
        f2.write( tweet['full_text'] + '[LABELS] ' + label_sentence + '<|endoftext|>')
