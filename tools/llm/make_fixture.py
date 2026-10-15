#!/usr/bin/env python3
"""시험용 아주 작은 'Qwen2 모양' 모델을 만들어요 (test/llm.js 에서 huggingface.co 대신 내줘요).
진짜 Qwen 과 같은 파일 이름 · 입출력 이름(input_ids, attention_mask, past_key_values.0.key/value -> logits, present.0.key/value)이고,
'assistant\\n' 다음에 {"meaning": "사과", ...} JSON 을 한 토큰씩 내놓아요. transformers.js 의 토크나이저 · 채팅 틀 · 생성 반복 · 디코딩을 그대로 거쳐요.
사용: python3 tools/llm/make_fixture.py <출력 폴더>   (pip: onnx tokenizers numpy)"""
import sys, os, json, numpy as np, onnx
from onnx import helper, TensorProto, numpy_helper
from tokenizers import Tokenizer, models, pre_tokenizers, decoders, trainers, AddedToken

out = sys.argv[1]; os.makedirs(os.path.join(out, 'onnx'), exist_ok=True)
SPECIAL = ['<|endoftext|>', '<|im_start|>', '<|im_end|>']
ANSWER = ['{"meaning": "', '사과', '", "phonetic": "', '/ˈæpəl/', '", "example": "', 'I eat an apple.', '", "exampleKo": "', '나는 사과를 먹는다.', '"}']
tok = Tokenizer(models.BPE(unk_token=None))
tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
tok.decoder = decoders.ByteLevel()
corpus = ['system user assistant You are a helpful dictionary assistant for Korean students learning English and Chinese. Reply with JSON only, no explanation.\n', 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 {}[]":,.\n']
tok.train_from_iterator(corpus, trainers.BpeTrainer(vocab_size=400, special_tokens=SPECIAL, initial_alphabet=pre_tokenizers.ByteLevel.alphabet(), show_progress=False))
tok.add_tokens([AddedToken(a, normalized=False, special=False) for a in ANSWER])
V = tok.get_vocab_size()
ids = [tok.token_to_id(a) for a in ANSWER]
assert None not in ids, ids
eos = tok.token_to_id('<|im_end|>'); nl = tok.encode('\n').ids[-1]
# 다음 토큰 표: '\n'(assistant 줄 끝) -> 답 첫 조각 -> ... -> 마지막 조각 -> <|im_end|>, 나머지는 모두 <|im_end|>
nxt = np.full(V, eos, dtype=np.int64); chain = [nl] + ids
for a, b in zip(chain, chain[1:]): nxt[a] = b
nxt[ids[-1]] = eos
W = np.full((V, V), -10.0, dtype=np.float32); W[np.arange(V), nxt] = 10.0
H, D = 1, 8
inputs = [helper.make_tensor_value_info('input_ids', TensorProto.INT64, ['batch', 'seq']),
          helper.make_tensor_value_info('attention_mask', TensorProto.INT64, ['batch', 'total']),
          helper.make_tensor_value_info('past_key_values.0.key', TensorProto.FLOAT, ['batch', H, 'past', D]),
          helper.make_tensor_value_info('past_key_values.0.value', TensorProto.FLOAT, ['batch', H, 'past', D])]
outputs = [helper.make_tensor_value_info('logits', TensorProto.FLOAT, ['batch', 'seq', V]),
           helper.make_tensor_value_info('present.0.key', TensorProto.FLOAT, ['batch', H, 'total', D]),
           helper.make_tensor_value_info('present.0.value', TensorProto.FLOAT, ['batch', H, 'total', D])]
inits = [numpy_helper.from_array(W, 'W'), numpy_helper.from_array(np.array([H, D], dtype=np.int64), 'hd'),
         numpy_helper.from_array(np.array(0.0, dtype=np.float32), 'zero'), numpy_helper.from_array(np.array([1], dtype=np.int64), 'one')]
nodes = [helper.make_node('Gather', ['W', 'input_ids'], ['logits'], axis=0),
         helper.make_node('Shape', ['input_ids'], ['ish']),
         # [batch, seq] -> [batch, H, seq, D]
         helper.make_node('Gather', ['ish', 'one'], ['seqd'], axis=0),
         helper.make_node('Slice', ['ish', 'zero_i', 'one'], ['bd']),
         helper.make_node('Concat', ['bd', 'h1', 'seqd', 'd1'], ['kvshape'], axis=0),
         helper.make_node('ConstantOfShape', ['kvshape'], ['newkv'], value=helper.make_tensor('v', TensorProto.FLOAT, [1], [0.0])),
         helper.make_node('Concat', ['past_key_values.0.key', 'newkv'], ['present.0.key'], axis=2),
         helper.make_node('Concat', ['past_key_values.0.value', 'newkv'], ['present.0.value'], axis=2)]
inits += [numpy_helper.from_array(np.array([0], dtype=np.int64), 'zero_i'), numpy_helper.from_array(np.array([H], dtype=np.int64), 'h1'), numpy_helper.from_array(np.array([D], dtype=np.int64), 'd1')]
g = helper.make_graph(nodes, 'tiny_qwen2', inputs, outputs, inits)
m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)]); m.ir_version = 8
onnx.checker.check_model(m)
for n in ['model_q4.onnx', 'model_q4f16.onnx']: onnx.save(m, os.path.join(out, 'onnx', n))
tok.save(os.path.join(out, 'tokenizer.json'))
TPL = "{% for message in messages %}{{'<|im_start|>' + message['role'] + '\\n' + message['content'] + '<|im_end|>' + '\\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\\n' }}{% endif %}"
json.dump({'tokenizer_class': 'Qwen2Tokenizer', 'chat_template': TPL, 'eos_token': '<|im_end|>', 'pad_token': '<|endoftext|>', 'bos_token': None, 'model_max_length': 32768,
           'added_tokens_decoder': {str(tok.token_to_id(s)): {'content': s, 'special': True, 'lstrip': False, 'rstrip': False, 'normalized': False, 'single_word': False} for s in SPECIAL}},
          open(os.path.join(out, 'tokenizer_config.json'), 'w'), ensure_ascii=False)
json.dump({'model_type': 'qwen2', 'architectures': ['Qwen2ForCausalLM'], 'num_hidden_layers': 1, 'num_attention_heads': H, 'num_key_value_heads': H, 'hidden_size': H * D,
           'vocab_size': V, 'eos_token_id': eos, 'bos_token_id': tok.token_to_id('<|endoftext|>'), 'max_position_embeddings': 32768},
          open(os.path.join(out, 'config.json'), 'w'))
json.dump({'eos_token_id': [eos], 'bos_token_id': tok.token_to_id('<|endoftext|>'), 'do_sample': False}, open(os.path.join(out, 'generation_config.json'), 'w'))
print('vocab', V, 'eos', eos, 'nl', nl, 'answer ids', ids, '->', out)
