document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }).then(tab => {
        var counter = 0;

        var fn = _ => chrome.tabs.sendMessage(tab[0].id, { from: 'popup', subject: 'body' }, el => {
            if (el || counter > 5)
                document.body.innerHTML = el || 'The page took too long to load. Please try again.';
            else
                setTimeout(fn, 100 * counter++);
        });
        fn();
    });
});