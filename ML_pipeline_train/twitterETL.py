import json
import os
from datetime import date
import re
from formatingTweetJson import extract, merge, gatherTweets, inferencedStrToArray
DIR = '../tweets/'
# running script to scrap tweets using users in users.txt file
with open(DIR+ 'users.txt', 'r') as userfile:
    users=userfile.read().splitlines()
for user in users:
    gatherTweets(user DIR)

# assuming tweet files have been scrapped on several different dates
# loop this logic for users in userfilie
USERNAME = 'eriktorenberg'
FILENAME = USERNAME + '_master.json'

THREADS = USERNAME + '_threads.json'
EXTRACTED = USERNAME + '_extracted.json'
LABELED = USERNAME + '_labeled.json'
LABELED2 = USERNAME + '_labeled2.json'

# merge files , extract relevant info, combine threads
# merge(USERNAME, DIR, FILENAME)
# extract(FILENAME,DIR,EXTRACTED)

# do inference
# google collabed

# format inference
# inferencedStrToArray(DIR, LABELED, LABELED2)

# upload to database
# use methods in server.js / neo4jQueries
