const { match } = require("assert");
const puppeteer = require("puppeteer");

/*
** getHostname
** param: url -> string : string containing the website url. Writed like "http://www.hostname.fr"
**
** description:
** parse the url to get the hostname. Expect to receive an url like http://www.google.com in order to return the hostname (google in this example)
*/
function getHostname(url) {
    const matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
    if (!matches) {
        return "website";
    }
    return matches[1].split('.')[1];
}

/*
** getScreenshot
** param: url -> string: param to go to in order to take a screenshot
**
** description:
** create a browser instance in order to reach the url given in parameter and make a screenshot. Will be saved in a file named "screenshot_hostname.png"
*/
async function getScreenshot(url) {
    console.log("processing....");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url).then(() => page.screenshot({ path: `screenshot_${getHostname(url)}.png` }));
    await browser.close();
    console.log(`${url} has been reached and the screenshot has been saved !`);
}

if (process.argv.length < 3) {
    console.log("Defaut test: screen http://www.google.com");
    getScreenshot("http://www.google.com");
} else {
    console.log(`Trying to screen: ${process.argv[2]}`);
    getScreenshot(process.argv[2]);
}