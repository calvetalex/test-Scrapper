// 1 - Import de puppeteer
const { exit } = require('process');
const puppeteer = require('puppeteer')

/*
// 2 - Récupération des URLs de toutes les pages à visiter
- waitFor("body"): met le script en pause le temps que la page se charge
- document.querySelectorAll(selector): renvoie tous les noeuds qui vérifient le selecteur
- [...document.querySelectorAll(selector)]: caste les réponses en tableau
- Array.map(link => link.href): récupère les attributs href de tous les liens
*/

/*
** getAllUrl
** params: url -> string : url where you will search items
**         browser -> puppeteer instance
** description:
** getAllUrl will check for all links with the classname "product_pod" as parent.
*/
async function getAllUrl(url, browser) {
    console.log(`Getting pages...`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 0 }); // wiatUnitl option is used to wait until a specific condition is reached, timeout set to 0 disable timeout error
    const result = await page.evaluate(() =>
        [...document.querySelectorAll('.product_pod a')].map(link => link.href),
    );
    console.log(`Getted ${result.length} pages !`);
    return result;
}

/*
** getDataFromUrl
** params: url -> string : url of an item
           browser -> puppeteer instance
** description:
** will get the item title and his price
*/
async function getDataFromUrl(url, browser) {
    console.log(`Accessing ${url}....`)
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    const result = await page.evaluate(() => {
        const title = document.querySelector('h1').innerText;
        const price = document.querySelector('.price_color').innerText;
        return { title, price };
    });
    return result;
}

async function scrap() {
    const browser = await puppeteer.launch();
    const urlList = await getAllUrl('http://books.toscrape.com/', browser);
    const result = await Promise.all(urlList.map(url => getDataFromUrl(url, browser)));
    browser.close();
    return result;
}

console.log("Call scrape...");
scrap().then(value => {
    console.log("Done ! finded :");
    console.log(value)
}).catch(e => {
    console.log(`error: ${e}`);
    exit(84);
})
