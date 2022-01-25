import urllib.request
from bs4 import BeautifulSoup
from unicodedata import normalize

def soup(url):
    return BeautifulSoup(urllib.request.urlopen(url), 'html.parser')

def clean(s):
    return s.encode("ascii", "ignore").decode()

url = 'https://www.usi.edu/science/engineering/faculty/'
urlSelector = 'div.info a[href]:not(.email-trigger)'
bioSelector = '.subtable'

with open('bios.txt', 'w') as b:
    with open('bio_urls.txt', 'w') as u:
        for link in soup(url).select(urlSelector):
            bio = [t.get_text(separator=' ', strip=True) for t in soup(link['href']).select(bioSelector)]

            u.write(link['href'] + '\n')
            b.write(clean(' '.join(bio)) + '\n')
