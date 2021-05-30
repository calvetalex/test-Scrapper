const cheerio = require("cheerio");
const fs = require("fs");
const Tool = require("./encapsulation");
const scraper_params = {
  DELAY_MS: 1000,
  MAX_REQUESTS_PER_DELAY: 1,
  MAX_TIMEOUT: 40000,
  MAX_EMPTY_REQUESTS: 5,
};
const DATA = [];
const MAP_LINK = {},
  MAP_PRODUCT = {};
const scraper = new Tool("bash", "https://ba-sh.com", scraper_params);

let ITOTAL = 0,
  IIN = 0,
  IOUT = 0;

scraper.addParsingCallback("parseCategory", function (data, params) {
  const $ = cheerio.load(data);
  let items = 0;

  scraper.logger.debug(JSON.stringify(params));
  $(".ProductTile.js-ProductTile").each(function () {
    const pid = $(this).attr("data-itemid");
    if (MAP_PRODUCT[pid]) return;
    scraper.logger.log(`Getting : ${pid}`);
    items += 1;
    MAP_PRODUCT[pid] = true;
    const name = $(this)
      .find(".ProductTile-link.js-ProductTile-link")
      .attr("title");
    const price = $(this).find(".hidden-product-price").attr("value");
    $(this)
      .find(".ProductTile-sizesBtn")
      .each(function (_, s) {
        const value = $(s).text().trim();
        const sid = `${pid}_${value}`;
        let stock = 1;
        if ($(s).attr("disabled")) stock = 0;
        if (!stock) IOUT += 1;
        else IIN += 1;
        ITOTAL += 1;
        scraper.logger.log(
          `P [${pid}] :: ${sid} // ${name} // ${value} // ${stock}`
        );
        DATA.push({
          pid,
          sid,
          name,
          price,
          size: value,
          category: params.category,
          stock,
        });
      });
  });

  if ($(".ProductList-loaderContent .Button.progessive-load-button").length) {
    if (items < 60) return;
    params.page += 1;
    params.current += items;
    const url = `${params.category_url}?start=${params.current}&sz=60`;
    scraper.logger.info(
      `CATEGORY [Page] :: ${params.category} // ${params.page}`
    );
    scraper.addRequest(url, "parseCategory", {}, params);
  }
});

scraper.addParsingCallback("getCategory", function (data, params) {
  const $ = cheerio.load(data);

  $("a.NavPrimary-itemLink.NavPrimary-itemLink--cat.js-NavPrimary-taglvl").each(
    function () {
      const url = $(this).attr("href");
      if (!url || url.match(/outlet/gi) || MAP_LINK[url]) return;
      MAP_LINK[url] = true;
      params.category = $(this).text().trim();
      params.category_url = url;
      params.page = 1;
      params.current = 0;
      scraper.logger.log(`CATEGORY [Main] :: ${params.category} // ${url}`);
      scraper.addRequest(url, "parseCategory", {}, { ...params });
    }
  );
});

scraper.addParsingCallback("end", function () {
  colsName = ["pid", "sid", "name", "price", "size", "category", "stock"];
  scraper.logger.log("Writing report...");
  let msg = colsName.join(",") + "\n";
  DATA.forEach((d) => {
    const { pid, sid, name, price, size, category, stock } = d;
    msg = `${msg}${pid},${sid},${name},${price},${size},${category},${stock}\n`;
  });
  scraper.logger.log(
    `RESUME: ${ITOTAL} products, ${IIN} available and ${IOUT} not available`
  );
  fs.writeFileSync("./report-scraper.csv", msg, { flag: "w+" });
});

(() => {
  scraper.logger.log("Starting program...");
  scraper.addRequest("https://ba-sh.com", "getCategory", {}, {});
})();
