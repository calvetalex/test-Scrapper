# test-Scrapper
Small repository to try and discover scrapping process. For this projet I use [puppeteer](https://pptr.dev/).

To see what is happening during the process, you can add the option `{ headless: false }` into the browser initialisation :
```javascript
    const browser = await puppeteer.launch({ headless: false });
```

## Summary

- screenshot/
- scrapping_demo/
- personnal_training/

***
## Screenshot

*./screenshot/test_screenshot.js*

First application with puppeteer. Load an url given in parameter and save a screenshot of it. The url must be formatted like *http://www.hostname.com*.

To try it:

`node test_screenshot.js` : will create a screenshot of http://www.google.com

`node test_screenshot.js [url]` : will create a screenshot of the url

***
## Scrapping_demo

*./scrapping_demo/scrape.js*

This program aims to scrap the website [books to scrap](http://books.toscrape.com/). This website has been made in order to test scrapping tools. The program will create a list with all items links and then get their title and price.

To try it:

`node scrape.js`

***
## Personal training

*./ytb/ratio.js*

This program aims to reveal the ratio like/dislike of a given youtube channel.