chrome.storage.sync.get(null, function (settings) {
	chrome.runtime.onMessage.addListener((msg, _, response) => {
		if (msg.from === 'popup' && msg.subject === 'body')
			response(createTersePageElement(settings.summary_size.value, settings.suppress_landing.value).outerHTML);
	});

	if (settings.show_icon.value) {
		var element = createTersePageElement(settings.summary_size.value, settings.suppress_landing.value);
		element.classList.add('terse-icon');
		document.body.appendChild(element);
	}
});

function createTersePageElement(summarySizeOptionValue, suppressLanding) {
	if (suppressLanding && ['', '/', '/search', '/search/'].includes(document.location.pathname.toLowerCase())) {
		var invalidElement = document.createElement('terse-invalid-page');
		invalidElement.innerHTML = 'Terse is configured to ignore landing pages and search pages, as they are generally bad candidates for summarization. You may change this in the extension\'s <i>Options</i>.';
		return invalidElement;
	}

	var scraper = new TerseContentScraper();
	var text = scraper.getContent(document.body);
	var entries = new TerseSentencesDocumentProcessor(text, summarySizeOptionValue / 20);
	if (text.length < 250 || entries.documents.length < 12) {
		var invalidElement = document.createElement('terse-invalid-page');
		invalidElement.innerHTML = 'This page isn\'t a good candidate for summarization. Try longer pages such as news articles, blog posts, or encyclopdia entries.';
		return invalidElement;
	}
	var title = scraper.getTitle(document);
	var description = scraper.getDescription(document);

	var topDocs = entries.getTopKDocuments();
	var topTopics = entries.getTopKTopics();

	var originalWordCount = entries.documents.reduce((a, b) => a + b.words.length, 0);
	var summaryWordCount = topDocs.reduce((a, b) => a + b.words.length, 0);
	var element = document.createElement('terse');

	var meta = document.createElement('meta');
	meta.setAttribute('http-equiv', 'Content-Type');
	meta.setAttribute('content', 'text/html; charset=UTF-8');
	element.appendChild(meta);

	var sp = document.createElement('terse-span');
	sp.innerHTML = 'Σ';
	element.appendChild(sp);

	var bg = document.createElement('terse-bg');
	element.appendChild(bg);
	var h1 = document.createElement('terse-h1');
	h1.innerHTML = title;
	element.appendChild(h1);

	var insights = document.createElement('terse-insight-subtitle');
	insights.innerHTML = 'Summarized a ' + originalWordCount + ' word document in ' + summaryWordCount + ' words, cutting read time by ' + Math.round((originalWordCount - summaryWordCount) / 200, 2) + ' minutes';
	element.appendChild(insights);

	if (description) {
		var descriptionTitle = document.createElement('terse-h2');
		descriptionTitle.innerHTML = 'Official Description';
		element.appendChild(descriptionTitle);

		var descriptionEl = document.createElement('terse-description');
		descriptionEl.innerHTML = description;
		element.appendChild(descriptionEl);
	}

	var topicTitle = document.createElement('terse-h2');
	topicTitle.innerHTML = 'Topics (Word Clusters)';
	topicTitle.setAttribute('data-count', topTopics.length);
	element.appendChild(topicTitle);
	var topicUl = document.createElement('terse-topic-ul');
	for (const [topic, topicObj] of topTopics) {
		var li = document.createElement('terse-li');
		li.setAttribute('data-count', topicObj.count);
		li.appendChild(document.createTextNode(topic));
		topicUl.appendChild(li);
	}
	element.appendChild(topicUl);

	var sentenceTitle = document.createElement('terse-h2');
	sentenceTitle.innerHTML = 'Summary (Key Sentences)';
	sentenceTitle.setAttribute('data-count', topDocs.length);
	element.appendChild(sentenceTitle);
	var sentenceUl = document.createElement('terse-ul');
	topDocs.forEach(doc => {
		var li = document.createElement('terse-li');
		li.appendChild(document.createTextNode(doc.original));
		sentenceUl.appendChild(li);
	});
	element.appendChild(sentenceUl);
	return element;
}