async function generateSettingElements() {
    var container = document.getElementById('options');
    var settings = await chrome.storage.sync.get(null);
    Object.entries(settings)
        .filter(([_, s]) => s && s.configurable)
        .sort(([_, s1], [__, s2]) => s1.sort_order - s2.sort_order)
        .forEach(async ([key, s]) => container.appendChild(await createSettingElement(key, s)));
}

async function createSettingElement(key, setting) {
    var element = {};

    switch (setting.type) {
        case 'boolean': {
            element = document.createElement('input');
            element.setAttribute('type', 'checkbox');
            if (setting.value)
                element.setAttribute('checked', 'checked');
            element.addEventListener('click', async e => {
                setting.value = e.target.checked;
                await setSettingValue(key, setting);
            });
            break;
        }
        case 'slider': {
            element = document.createElement('slider');
            var input = document.createElement('input');
            input.setAttribute('type', 'range');
            input.setAttribute('min', setting.min);
            input.setAttribute('max', setting.max);
            input.setAttribute('value', setting.value);
            input.classList.add('slider');
            input.addEventListener('click', async e => {
                setting.value = e.target.value
                await setSettingValue(key, setting);
            });
            element.appendChild(input);
            break;
        }
        default: {
            return;
        }
    }

    var label = document.createElement('label');
    label.appendChild(element);
    var labelText = document.createElement('span');
    labelText.innerHTML = setting.name;
    label.appendChild(labelText);

    var description = document.createElement('span');
    description.innerHTML = setting.description;

    var container = document.createElement('li');
    container.appendChild(label);
    container.appendChild(description);

    return container;
}

async function setSettingValue(key, value) {
    await chrome.storage.sync.set({ [key]: value });
}

function createMaterialIcon(iconString, href) {
    var icon = document.createElement('span');
    icon.classList.add('icon');
    icon.innerHTML = iconString;
    if (href != null) {
        var ref = document.createElement('a');
        ref.setAttribute('href', href);
        ref.appendChild(icon);
        ref.setAttribute('target', '_blank');
        ref.setAttribute('rel', 'noopener noreferrer');
        return ref;
    }
    return icon;
}

function toggleTest(event) {
    var content = event.target.parentElement.parentElement.children[1];
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        event.target.classList.remove('collapsed');
    }
    else {
        content.classList.add('collapsed');
        event.target.classList.add('collapsed');
    }
}

function formatSentence(sentence) {
    return sentence.replace('."', '".')
        .replace('.\'', '\'.')
        .replace('?"', '"?')
        .replace('?\'', '\'?')
        .replace('!"', '"!')
        .replace('!\'', '\'!');
}

function performTest(sentences) {
    var processor = new TerseSentencesDocumentProcessor(null, 0.1);
    sentences = sentences.map(s => formatSentence(s));
    processor.processSentencesDocuments(sentences);
    return processor.getTopKDocuments();
}

function generateTests() {
    var container = document.getElementById('tests');
    terseTests.forEach(t => {
        var kDocs = performTest(t.sentences.map(s => s.sentence));

        var elem = document.createElement('li');
        var header = document.createElement('div');
        header.classList.add('test-heading');

        var expansion = createMaterialIcon('chevron_right');
        expansion.classList.add('collapsed');
        expansion.addEventListener('click', function (event) {
            toggleTest(event);
        });
        header.appendChild(expansion);

        var title = document.createElement('span');
        title.innerHTML = t.name;
        header.appendChild(title);

        var headerIcon = createMaterialIcon('open_in_new', t.url);
        header.appendChild(headerIcon);
        elem.appendChild(header);

        var results = document.createElement('div');
        results.classList.add('test-results');

        var content = document.createElement('div');
        content.classList.add('test-content', 'collapsed');

        var table = document.createElement('table');
        var body = document.createElement('tbody');
        var head = document.createElement('tr');
        var head1 = document.createElement('th');
        head1.innerHTML = 'Sentence';
        var head2 = document.createElement('th');
        head2.innerHTML = 'Score';
        var head3 = document.createElement('th');
        head3.innerHTML = 'Retrieved';
        head.appendChild(head1);
        head.appendChild(head2);
        head.appendChild(head3);
        body.appendChild(head);

        var overallScore = 0;
        var totalRetrieved = 0;

        t.sentences.forEach(s => {
            var row = document.createElement('tr');
            var cellSentence = document.createElement('td');
            cellSentence.innerHTML = s.sentence;

            var cellScore = document.createElement('td');
            cellScore.innerHTML = s.score;
            cellScore.classList.add('score');

            var cellRetrieved = document.createElement('td');
            if (kDocs.filter(k => k.original == formatSentence(s.sentence)).length > 0) {
                cellRetrieved.appendChild(createMaterialIcon('check', null));
                totalRetrieved++;
                overallScore += s.score;
            }
            cellRetrieved.classList.add('retrieved');

            row.appendChild(cellSentence);
            row.appendChild(cellScore);
            row.appendChild(cellRetrieved);
            body.appendChild(row);
        });

        results.innerHTML = Math.round(overallScore / totalRetrieved * 100) + '%';
        header.appendChild(results);
        table.appendChild(body);
        content.appendChild(table);
        elem.appendChild(content);

        container.appendChild(elem);
    });
}

generateSettingElements();
generateTests();