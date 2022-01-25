import numpy as np
import math


def normalize(input_matrix):
    row_sums = input_matrix.sum(axis=1)
    try:
        assert (np.count_nonzero(row_sums)==np.shape(row_sums)[0]) # no row should sum to zero
    except Exception:
        raise Exception("Error while normalizing. Row(s) sum to zero")
    new_matrix = input_matrix / row_sums[:, np.newaxis]
    return new_matrix

       
class Corpus(object):
    def __init__(self, documents_path):
        self.documents = []
        self.vocabulary = []
        self.likelihoods = []
        self.documents_path = documents_path
        self.term_doc_matrix = None 
        self.document_topic_prob = None  # P(z | d)
        self.topic_word_prob = None  # P(w | z)
        self.topic_prob = None  # P(z | d, w)

        self.number_of_documents = 0
        self.vocabulary_size = 0

    def build_corpus(self):
        with open(self.documents_path) as file:
            for line in file.readlines():
                self.number_of_documents += 1
                self.documents.append(line.split(' '))

    def build_vocabulary(self):
        self.vocabulary = list({w for d in self.documents for w in d})
        self.vocabulary_size = len(self.vocabulary)

    def build_term_doc_matrix(self):
        self.term_doc_matrix = np.zeros([self.number_of_documents, self.vocabulary_size])
        for docIdx in range(0, self.number_of_documents):
            for termIdx, term in enumerate(self.vocabulary):
                self.term_doc_matrix[docIdx][termIdx] = len([w for w in self.documents[docIdx] if w == term])

    def initialize_randomly(self, number_of_topics):
        self.document_topic_prob = normalize(np.random.random_sample((self.number_of_documents, number_of_topics)))
        self.topic_word_prob = normalize(np.random.random_sample((number_of_topics, len(self.vocabulary))))

    def initialize_uniformly(self, number_of_topics):
        self.document_topic_prob = np.ones((self.number_of_documents, number_of_topics))
        self.document_topic_prob = normalize(self.document_topic_prob)

        self.topic_word_prob = np.ones((number_of_topics, len(self.vocabulary)))
        self.topic_word_prob = normalize(self.topic_word_prob)

    def initialize(self, number_of_topics, random=False):
        if random:
            self.initialize_randomly(number_of_topics)
        else:
            self.initialize_uniformly(number_of_topics)

    def expectation_step(self, number_of_topics):
        print("E step:")
        for docIdx in range(0, self.number_of_documents):
            for wordIdx in range(0, self.vocabulary_size):
                total = 0
                for topicIdx in range(0, number_of_topics):
                    self.topic_prob[docIdx][topicIdx][wordIdx] = self.document_topic_prob[docIdx][topicIdx] * self.topic_word_prob[topicIdx][wordIdx]
                    total += self.topic_prob[docIdx][topicIdx][wordIdx]
                for topicIdx in range(0, number_of_topics):
                    self.topic_prob[docIdx][topicIdx][wordIdx] = self.topic_prob[docIdx][topicIdx][wordIdx] / total

    def maximization_step(self, number_of_topics):
        print("M step:")
        for topicIdx in range(0, number_of_topics):
            for wordIdx in range(0, self.vocabulary_size):
                self.topic_word_prob[topicIdx][wordIdx] = 0
                for docIdx in range(0, self.number_of_documents):
                    self.topic_word_prob[topicIdx][wordIdx] += self.term_doc_matrix[docIdx][wordIdx] * self.topic_prob[docIdx][topicIdx][wordIdx]
        self.topic_word_prob = normalize(self.topic_word_prob)

        for topicIdx in range(0, number_of_topics):
            for docIdx in range(0, self.number_of_documents):
                self.document_topic_prob[docIdx][topicIdx] = 0
                for wordIdx in range(0, self.vocabulary_size):
                    self.document_topic_prob[docIdx][topicIdx] += self.term_doc_matrix[docIdx][wordIdx] * self.topic_prob[docIdx][topicIdx][wordIdx]
        self.document_topic_prob = normalize(self.document_topic_prob)

    def calculate_likelihood(self, number_of_topics):
        total = 0
        for docIdx in range(0, self.number_of_documents):
            for wordIdx in range(0, self.vocabulary_size):
                tTotal = 0
                for topicIdx in range(0, number_of_topics):
                    tTotal += self.topic_word_prob[topicIdx][wordIdx] * self.document_topic_prob[docIdx][topicIdx]
                if tTotal == 0: continue
                total += self.term_doc_matrix[docIdx][wordIdx] * np.log(tTotal)
        self.likelihoods.append(total)

    def plsa(self, number_of_topics, max_iter, epsilon):
        print ("EM iteration begins...")
        self.build_term_doc_matrix()
        self.topic_prob = np.zeros([self.number_of_documents, number_of_topics, self.vocabulary_size], dtype=np.float)
        self.initialize(number_of_topics, random=True)
        current_likelihood = 0.0

        for iteration in range(max_iter):
            print("Iteration #" + str(iteration + 1) + "...")
            self.expectation_step(number_of_topics)
            self.maximization_step(number_of_topics)
            self.calculate_likelihood(number_of_topics)
            if (iteration > 1 and self.likelihoods[iteration] - self.likelihoods[iteration - 1] < epsilon):
                break

def main():
    documents_path = 'data/test.txt'
    corpus = Corpus(documents_path)  # instantiate corpus
    corpus.build_corpus()
    corpus.build_vocabulary()
    print(corpus.vocabulary)
    print("Vocabulary size:" + str(len(corpus.vocabulary)))
    print("Number of documents:" + str(len(corpus.documents)))
    number_of_topics = 2
    max_iterations = 50
    epsilon = 0.001
    corpus.plsa(number_of_topics, max_iterations, epsilon)

if __name__ == '__main__':
    main()
