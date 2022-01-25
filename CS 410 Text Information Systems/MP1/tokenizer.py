import metapy


def tokens_lowercase(doc):
    tok = metapy.analyzers.ICUTokenizer(suppress_tags=True)
    tok = metapy.analyzers.LowercaseFilter(tok)
    tok = metapy.analyzers.LengthFilter(tok, min=2, max=5)
    tok = metapy.analyzers.Porter2Filter(tok)

    ana = metapy.analyzers.NGramWordAnalyzer(3, tok)

    trigrams = ana.analyze(doc)
    
    tok.set_content(doc.content())
    tokens, counts = [], []
    for token, count in trigrams.items():
        counts.append(count)
        tokens.append(token)
    return tokens


if __name__ == '__main__':
    doc = metapy.index.Document()
    doc.content("I said that I can't believe that it only costs $19.95! I could only find it for more than $30 before.")
    print(doc.content())
    tokens = tokens_lowercase(doc)
    print(tokens)
