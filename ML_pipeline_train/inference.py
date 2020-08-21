# !pip3 install transformers
# !pip3 install Cython
import json
import os
import torch
from transformers import GPT2Tokenizer, GPT2LMHeadModel
import numpy as np
import sys
import pathlib

DIR = '../tweets/'
FILENAME = 'micsolana_20200727-000000'
# sys.argv[1]
LABELED = FILENAME + '_labeled.json'

# inference engine
device = 'cpu'
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__)) + "/testtweet"

tokenizer = GPT2Tokenizer.from_pretrained(OUTPUT_DIR)
model = GPT2LMHeadModel.from_pretrained(OUTPUT_DIR)
model = model.to(device)

if sys.argv[1] == 'file':
    with open(DIR + FILENAME + '_extracted.json') as f:
      data = json.load(f)
    txtNlabels = []

    for thetext in data[:10]:
        encoded_prompt = tokenizer.encode(thetext['full_text'] + " [LABELS]", add_special_tokens=False, return_tensors="pt")
        encoded_prompt = encoded_prompt.to(device)
        output_sequences = model.generate(
              input_ids=encoded_prompt,
              max_length=290,
              temperature=.85,
              do_sample=True,
              num_return_sequences=1,
        )
        # print(output_sequences)

        if len(output_sequences.shape) > 2:
          output_sequences.squeeze_()

        generated_sequences = []

        for generated_sequence_idx, generated_sequence in enumerate(output_sequences):
          generated_sequence = generated_sequence.tolist()

          # Decode text
          text = tokenizer.decode(generated_sequence, clean_up_tokenization_spaces=True)

          # Remove all text after the stop token
          # text = text[: text.find(args.stop_token) if args.stop_token else None]

          # Remove the excess text that was used for pre-processing
          # text = text[len(tokenizer.decode(encoded_prompt[0], clean_up_tokenization_spaces=True)) :]

          # Add the prompt at the beginning of the sequence.
          # total_sequence = prompt_text + text
          txtNlabels = txtNlabels + [{'full_text': thetext['full_text'] , 'labels': text.split('[LABELS]')[1]}]
          # generated_sequences.append(text)
          # print(generated_sequences)

    # modified version
    # labels is text

    annotated = open(DIR+ LABELED,"w+")
    json.dump(txtNlabels ,annotated)

# real inference realtime?
else:
    encoded_prompt = tokenizer.encode(sys.argv[2] + " [LABELS]", add_special_tokens=False, return_tensors="pt")
    encoded_prompt = encoded_prompt.to(device)
    output_sequences = model.generate(
          input_ids=encoded_prompt,
          max_length=290,
          temperature=.85,
          do_sample=True,
          num_return_sequences=1,
    )
    # print(output_sequences)

    if len(output_sequences.shape) > 2:
      output_sequences.squeeze_()

    generated_sequences = []

    for generated_sequence_idx, generated_sequence in enumerate(output_sequences):
      generated_sequence = generated_sequence.tolist()

      # Decode text
      text = tokenizer.decode(generated_sequence, clean_up_tokenization_spaces=True)

      # Remove all text after the stop token
      # text = text[: text.find(args.stop_token) if args.stop_token else None]

      # Remove the excess text that was used for pre-processing
      # text = text[len(tokenizer.decode(encoded_prompt[0], clean_up_tokenization_spaces=True)) :]

      # generated_sequences.append(text)
      # print(generated_sequences)
    dataToSendBack = text.split('[LABELS]')[1]
    print(dataToSendBack)
    sys.stdout.flush()

# if __name__ == "__main__":
#     # main(sys.argv[1:])
#     print('this is neat')
#     sys.stdout.flush()
