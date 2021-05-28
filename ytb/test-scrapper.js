const cheerio = require('cheerio');
const fs = require("fs");
const Tool = require('./encapsulation');
const scraper_params = {
  DELAY_MS: 3000,
  MAX_REQUESTS_PER_DELAY: 5,
  MAX_TIMEOUT: 20000,
  MAX_EMPTY_REQUESTS: 15,
};
const DATA = [];
const MAP_VIDEO = {};
const scraper = new Tool("ytb", "https://www.youtube.com", scraper_params);

scraper.addParsingCallback("getRatio", function(data, params) {
  const $ = cheerio.load(data);

  let ratio = $("div#tooltip.style-scope.tp-yt-paper-tooltip.hidden").text().trim();
  ratio = ratio.split('/');
  const like = ratio[0].match(/(\d+(?:\ \d+)?)/gm)[0];
  const dislike = ratio[1].match(/(\d+(?:\ \d+)?)/gm)[0];
  scraper.logger.log(`V [${params.name}] :: ${like} // ${dislike}`);
  DATA.push({ name: params.name, like, dislike });
});

scraper.addParsingCallback("getVideo", function(data, params) {
  const $ = cheerio.load(data);

  $(".style-scope.ytd-grid-video-renderer").each(function() {
    const url = $(this).find("a#video-title").attr("href");
    if (MAP_VIDEO[url]) return;
    MAP_VIDEO[url] = true;
    params.name = $(this).find("a#video-title").attr("title");
    scraper.logger.log(`VIDEO :: ${params.name}`);
    scraper.addRequest(url, "getVideo");
  });
});

function makeCsv(colsName) {
  if (!colsName || colsName.length === 0) return;
  scraper.logger.log("Writing report...");
  const stream = fs.createWriteStream("./report-scraper.log", { flags: "w+" });
  let msg = colsName.join(',') + '\n';
  DATA.forEach(d => {
    const { name, like, dislike } = d;
    msg = `${msg}${name},${like},${dislike}\n`;
  });
  stream.write(msg);
}

(() => {
  scraper.logger.log("Starting program...");
  scraper.addRequest("https://www.youtube.com/c/GoTaG4/videos", "getVideo", {});
  makeCsv(["video","like", "dislike"]);
})();
