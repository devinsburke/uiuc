const rGoodContent = /article|body|content|entry|hentry|main|page|post|text|blog|story|column/i;
const rBadContent = /attribution|combx|comment|contact|reference|foot|footer|footnote|infobox|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget|community|disqus|extra|header|menu|remark|rss|shoutbox|sidebar|sponsor|ad-break|pagination|pager|popup|tweet|twitter/i;
const blockElements = ['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'CANVAS', 'DD', 'DIV', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'HR', 'LI', 'MAIN', 'NAV', 'NOSCRIPT', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TD', 'TH', 'TR', 'THEAD', 'TFOOT', 'UL', 'VIDEO'];
const stopSelectors = {
	role: ['alert', 'alertdialog', 'banner', 'button', 'columnheader', 'combobox', 'dialog', 'directory', 'figure', 'heading', 'img', 'listbox', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'navigation', 'option', 'search', 'searchbox', 'status', 'toolbar', 'tooltip'],
	tag: ['cite', 'code', 'dialog', 'dl', 'dt', 'figcaption', 'footer', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'label', 'link', 'menu', 'menuitem', 'meta', 'nav', 'noscript', 'ol', 'output', 'pre', 'script', 'style', 'sup', 'tfoot'],
	visual: ['address', 'blockquote', 'button', 'canvas', 'embed', 'figure', 'form', 'frame', 'iframe', 'img', 'input', 'object', 'select', 'svg', 'textarea', 'video'],
	class: ['blogroll', 'caption', 'citation', 'comment', 'community', 'contact', 'copyright', 'extra', 'foot', 'footer', 'footnote', 'infobox', 'masthead', 'media', 'meta', 'metadata', 'mw-jump-link', 'mw-revision', 'navigation', 'navigation-not-searchable', 'noprint', 'outbrain', 'pager', 'popup', 'promo', 'reference', 'reference-text', 'references', 'related', 'related-articles', 'remark', 'rss', 's-popover', 'scroll', 'shopping', 'shoutbox', 'sidebar', 'sponsor', 'tag-cloud', 'tags', 'thumb', 'tool', 'user-info', 'widget', 'wikitable'],
};

class TerseContentScraper {
	getDescription(document) {
		var metas = document.querySelectorAll('meta[description],meta[name=description],meta[property=og\\:description]');
		for (var meta of metas) {
			if (meta.description)
				return meta.description;
			if (meta.content)
				return meta.content;
		}
		var shortDescription = document.querySelectorAll('.shortdescription');
		if (shortDescription.length == 1)
			return shortDescription[0].innerText;

		return '';
	}

	getTitle(document) {
		var h1s = document.querySelectorAll('h1');
		if (h1s.length == 1)
			return h1s[0].innerText;
		return document.title.split(' - ')[0].trim();
    }

	getContent(body) {
		var textStopSelector = stopSelectors.tag.join(',');
		textStopSelector += ',.' + stopSelectors.visual.join(',');
		textStopSelector += ',[role=' + stopSelectors.role.join('],[role=') + ']';
		textStopSelector += ',.' + stopSelectors.class.join(',.');

		var element = document.createElement('body');
		element.innerHTML = body.innerHTML.replace(/[\r\n]+/g, ' ');

		for (var el of element.querySelectorAll(textStopSelector))
			this.destroyElement(el);
		for (var el of element.querySelectorAll('ol,p,span,td,ul'))
			if (this.getTagConsumption(el, 'a') > 0.4)
				this.destroyElement(el);
		for (var el of element.querySelectorAll('div > a:first-of-type,section > a:first-of-type'))
			if (this.getTagConsumption(el.parentNode, 'a') > 0.4)
				this.destroyElement(el.parentNode);

        var allElements = element.querySelectorAll('p,td,pre,span,div');
		var nodes = [];
        for (var i=0, node=null; (node = allElements[i]); i++) {
            var str = node.className + node.id;
			var innerText = this.getText(node);

			if (!node.parentNode || innerText.length < 25)
				continue;
			if (str.search(rBadContent) != -1 && str.search(rGoodContent) == -1)
				continue;

			[node.parentNode, node.parentNode.parentNode].forEach(n => {
				if (n && n.score == null) {
					this.scoreElement(n);
					nodes.push(n);
				}
			});

            var score = 1;
            score += innerText.split(',').length;
			score += Math.min(innerText.length / 100, 3);
            score += 1 - this.getTagConsumption(node, 'a');
			node.parentNode.score += score;
			if (node.parentNode.parentNode)
				node.parentNode.parentNode.score += score / 2;
        }

		var selection = nodes.sort((a, b) => b.score - a.score)[0];
		if (!selection)
			return '';

		this.removeCaptions(selection, 'form', 'table', 'ul', 'div');
		for (var e of selection.querySelectorAll('*'))
			this.padIfBlockElement(e);

        return selection.innerText;
    }

    getText(e) {
		return e.innerText.trim()
			.replace(/ {2,}/g, ' ')
			.replace(/[\r\n\t]+/g, '\n');
    }

    scoreElement(e) {
		e.score = 0;
		[e.className, e.id, e.tagName].forEach(s => {
			if (s.search(rBadContent) !== -1)
				e.score -= 25;
			if (s.search(rGoodContent) !== -1)
				e.score += 25;
		});
		if (['DIV'].includes(e.tagName))
			e.score += 5;
		else if (['PRE','TD'].includes(e.tagName))
			e.score += 3;
		else if (['UL','DD','LI'].includes(e.tagName))
			e.score -= 3;
    }

	getTagConsumption(e, tag) {
		return [...e.querySelectorAll(tag)].reduce((a,v) => a + this.getText(v).length, 0) / this.getText(e).length;
	}

    removeCaptions(e, ...tags) {
        var nodes = e.querySelectorAll(tags.join(','));

        for (var i=nodes.length-1; i >= 0; i-=1) {
			var item = nodes[i];
			var text = this.getText(item);
			if (item.score && item.score < 0) {
				this.destroyElement(item);
			}
			else if (text.split(',').length-1 < 10) {
				var p = item.getElementsByTagName("p").length;
				var img = item.getElementsByTagName("img").length;
				var li = item.getElementsByTagName("li").length - 100;
				var input = item.getElementsByTagName("input").length;
				var embed = item.getElementsByTagName("embed").length;

				if (img > p || li > p && !['UL', 'OL'].includes(item.tagName)) {
					this.destroyElement(item);
				} else if (input > Math.floor(p / 3)) {
					this.destroyElement(item);
				} else if (text.length < 75 && img+embed > 0) {
					this.destroyElement(item);
				}
            }
        }
	}

	isBlockElement(e) {
		return (['block', 'absolute'].includes(e.style.display) || !e.style.display && blockElements.includes(e.tagName));
    }

	padIfBlockElement(e) {
		if (e.parentNode && this.isBlockElement(e)) {
			e.parentNode.insertBefore(document.createTextNode('\n'), e);
			e.parentNode.insertBefore(document.createTextNode('\n'), e.nextSibling);
		}
	}

	destroyElement(e) {
		if (e && e.parentNode) {
			this.padIfBlockElement(e);
			var newContainer = document.createElement('div');
			e.parentNode.removeChild(e);
			newContainer.appendChild(e);
			newContainer.innerHTML = '';
		}
    }
}
