# worktable-demo

Step 4 工作台的一份可跑通样例。10 句假口播稿，用来验证管道和演示交互，不是任何真实项目。

| 文件 | 是什么 |
| --- | --- |
| `source.srt` | 假的剪映 SRT：无标点，模拟真实上游 |
| `corrected.txt` | 校对稿：只补了标点、改了错别字，没有增删内容 |
| `transcript.sentences.json` | `map` 的产物：校对稿对齐回 SRT 时间后的分句，含 `check` 守卫结果 |
| `worktable.html` | `html` 的产物：**渲染结果，不要手改**。改了要从上面两个文件重新生成 |

重新生成：

```bash
python3 ../../scripts/build_worktable.py map --srt source.srt --text corrected.txt \
  --project worktable-demo -o transcript.sentences.json
python3 ../../scripts/build_worktable.py html transcript.sentences.json -o worktable.html
```

守卫会拒绝编造内容的校对稿：往 `corrected.txt` 里加一整句原话没有的内容再跑 `map`，应当以 exit 2 失败。
