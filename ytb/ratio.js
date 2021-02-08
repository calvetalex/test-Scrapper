const { exit } = require("process");
const puppeteer = require("puppeteer");

async function getName(page) {
    return await page.evaluate(() => document.querySelector('#text-container #text.ytd-channel-name').innerText);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractUrl(page) {
    return await page.evaluate(() =>
        [...document.querySelectorAll('#thumbnail.yt-simple-endpoint.inline-block.style-scope.ytd-thumbnail')].map(link => link.href),
    );
}

async function autoScroll(page, scrollDelay = 100) {
    console.log("Scrolling to load more videos...")
    let items = [];
    try {
        let previousHeight;
        while (true) {
            items = await extractUrl(page);
            console.log(`Loaded ${items.length} items...`);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            sleep(scrollDelay);
        }
    } catch (e) {
        console.log("Ending scroll...")
    }
    return items;
}

async function getChannelInfos(browser, url) {
    console.log("Getting videos...");
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 0 });
        console.log("Looking for ytb channel name...");
        const name = await getName(page);
        const videosUrl = await autoScroll(page);
        return { name, videosUrl };
    } catch(e) {
        console.error(`Impossible to find a ytb channel at ${url}`);
        browser.close();
        exit(84);
    }
}

async function getDataFromUrl(browser, url) {
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 0 });
        return await page.evaluate(() => {
            const views = document.querySelector('.view-count').innerText;
            const ratio = document.querySelector('#sentiment #tooltip.style-scope.paper-tooltip.hidden').innerText;
            return { views, ratio };
        });
    } catch(e) {
        console.error(`ERROR: '${url}' seems impossible to reach`)
        return {};
    }
}

function getStatistics(allStats) {
    allStats = allStats.map(elem => {
        if (elem.views && elem.ratio) {
            const views = Number(elem.views.replace(/[^0-9]/gmi, ""));
            const ratio = elem.ratio.replace(/\n|\s/gmi, "");
            const like = Number(ratio.split('/')[0]);
            const dislike = Number(ratio.split('/')[1]);
            return { views, like, dislike };
        }
    });
    const totalView = allStats.reduce((a, b) => {
        return { views: a.views + b.views };
    }).views;
    const satisfaction = allStats.reduce((a, b) => {
        return { like: a.like + b.like };
    }).like;
    const dissatisfaction = allStats.reduce((a, b) =>  {
        return { dislike: a.dislike + b.dislike };
    }).dislike;
    return { totalView, satisfaction, dissatisfaction };
}

async function getRatio(url, debugMode) {
    console.log(`Beginning process. Target = ${url}`);
    const browser = await puppeteer.launch({ headless: debugMode ? false : true });
    const ytbInfos = await getChannelInfos(browser, url);
    const name = ytbInfos.name;
    let urlList = ytbInfos.videosUrl;
    urlList = urlList.filter(url => !(!url || url.length === 0 || url === ""));
    console.log(`Finded videos: ${urlList.length}\nScrapping data...`);
    let allStats = await Promise.all(urlList.map(link => getDataFromUrl(browser, link)));
    browser.close();
    allStats = allStats.filter(e => Object.keys(e).length !== 0);
    return Object.assign({}, { name }, getStatistics(allStats));
}

function printData(result) {
    if (result && Object.keys(result).length !== 0) {
        console.log("\nBILAN:");
        console.log(`\tChannel:\t${result.name}`);
        console.log(`\tTotal views:\t${new Intl.NumberFormat().format(result.totalView)}`);
        console.log(`\tLikes:\t\t${new Intl.NumberFormat().format(result.satisfaction)}`);
        console.log(`\tDislikes:\t${new Intl.NumberFormat().format(result.dissatisfaction)}`);
    } else {
        console.log('No data avaible');
    }
}

const line = "\n==============\n";
console.log(`${line} YTB scrapper${line}`);
if (process.argv.length < 3) {
    console.error("To run this script, please use 'node ratio.js url [--debug]', where url is a link to a ytb channel and debug a boolean value.");
    exit(84);
} else {
    if (process.argv[3] && process.argv[3] === "--debug") {
        getRatio(process.argv[2], true).then(res => printData(res));
    } else {
        getRatio(process.argv[2], false).then(res => printData(res));
    }
}