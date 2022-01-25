import math
import sys
import time
import metapy
import pytoml

class InL2Ranker(metapy.index.RankingFunction):
    def __init__(self, param):
        self.param = param
        super(InL2Ranker, self).__init__()

    def score_one(self, sd):
        tfn = sd.doc_term_count * math.log(1 + (sd.avg_dl/sd.doc_size), 2)
        p1 = sd.query_term_weight
        p2 = tfn / (tfn + self.param)
        p3 = math.log((sd.num_docs + 1) / (sd.corpus_term_count + 0.5), 2)
        return p1 * p2 * p3


def load_ranker(cfg_file, c):
    return InL2Ranker(c)

def write_avg_precisions(filename, idx, ev, ranker):
    start_time = time.time()
    top_k = 10
    query_path = query_cfg.get('query-path', 'queries.txt')
    query_start = query_cfg.get('query-id-start', 0)
    query = metapy.index.Document()
    avgs = []

    with open(query_path) as query_file:
        with open(filename, "w") as output_file:
            for query_num, line in enumerate(query_file):
                query.content(line.strip())
                results = ranker.score(idx, query, top_k)
                avg_p = ev.avg_p(results, query_start + query_num, top_k)
                avgs.append(avg_p)
                output_file.write(str(avg_p) + '\n')
    return avgs

if __name__ == '__main__':
    cfg = 'config.toml'
    param = 6

    if len(sys.argv) > 1:
        cfg = sys.argv[1]
    if len(sys.argv) > 2:
        param = sys.argv[2]

    idx = metapy.index.make_inverted_index(cfg)
    ev = metapy.index.IREval(cfg)

    with open(cfg, 'r') as fin:
        cfg_d = pytoml.load(fin)

    query_cfg = cfg_d['query-runner']
    if query_cfg is None:
        print("query-runner table needed in {}".format(cfg))
        sys.exit(1)

    bm25 = write_avg_precisions('bm25.avg_p.txt', idx, ev, metapy.index.OkapiBM25(k1=1.2,b=0.75,k3=500))
    inl2 = write_avg_precisions('inl2.avg_p.txt', idx, ev, load_ranker(cfg, param))

    from scipy import stats
    s, p = stats.ttest_rel(bm25, inl2)
    with open("significance.txt", "w") as output_file:
        output_file.write(str(p))
