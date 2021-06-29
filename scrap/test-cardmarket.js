const cheerio = require("cheerio");
const Tool = require("./encapsulation");
const scraper_params = {
  DELAY_MS: 1000,
  MAX_REQUESTS_PER_DELAY: 1,
  MAX_TIMEOUT: 40000,
  MAX_EMPTY_REQUESTS: 15,
};
let MAP_PRODUCTS = {};
const NOT_FOUND = {};
const scraper = new Tool(
  "cardmarket",
  "https://www.cardmarket.com/en/YuGiOh",
  scraper_params
);

scraper.addParsingCallback("parseProduct", (html, params) => {
  const $ = cheerio.load(html);
  const text = $(".info-list-container").text().trim();
  try {
    console.log(text.match(/De\s?(\d+(?:,\d{1,2})?)/gm));
    console.log(text.match(/prix\s?(\d+(?:,\d{1,2})?)/gm));
    MAP_PRODUCTS[params.cardName].u_price = parseFloat(
      text
        .match(/De\s?(\d+(?:,\d{1,2}))/gm)[0]
        .replace(/De\s?/gm, "")
        .replace(/,/gm, ".")
    ).toFixed(2);
    MAP_PRODUCTS[params.cardName].average = parseFloat(
      text
        .match(/prix\s?(\d+(?:,\d{1,2}))/gm)[0]
        .replace(/prix\s?/gm, "")
        .replace(/,/gm, ".")
    ).toFixed(2);
    MAP_PRODUCTS[params.cardName].total = (
      MAP_PRODUCTS[params.cardName].quantity *
      MAP_PRODUCTS[params.cardName].u_price
    ).toFixed(2);
  } catch (e) {
    console.log(e);
    NOT_FOUND[params.cardName] = true;
  }
});

scraper.addParsingCallback("parseCategory", function (data, params) {
  const $ = cheerio.load(data);
  let min = 9999999999999;
  const prices = [];

  if (MAP_PRODUCTS[params.cardName].id) {
    const cardExt = MAP_PRODUCTS[params.cardName].id
      .split("-")[0]
      .toLowerCase();
    $(".table-body div.row.no-gutters[id^='productRow']").each(function () {
      const extension = $(this)
        .find(".block.vAlignParent.expansionIcon.yugiohExpansionIcon")
        .text()
        .trim()
        .toLowerCase();
      if (extension === cardExt) {
        let url = $(this)
          .find("div.col-12.col-md-8.px-2.flex-column a")
          .attr("href");
        if (!url) {
          NOT_FOUND[params.cardName] = true;
        } else {
          url = "https://www.cardmarket.com" + url;
          scraper.addRequest(url, "parseProduct", {}, params);
        }
      }
    });
  } else {
    $(".col-price.pr-sm-2").each(function () {
      const value = parseFloat(
        ($(this)
          .text()
          .match(/(\d+(?:\,\d{1,2})?)/gm) || ["9999999999999"])[0].replace(
          /,/gm,
          "."
        )
      );
      if (!value || value === 0) return;
      if (min > value) min = value;
      if (value !== 9999999999999) prices.push(value);
      console.log(`${params.cardName} // ${value}`);
    });
    if (min === 9999999999999) {
      NOT_FOUND[params.cardName] = true;
      return;
    }
    console.log(`Keeping -> ${params.cardName} // ${min}`);
    MAP_PRODUCTS[params.cardName].u_price = min;
    MAP_PRODUCTS[params.cardName].average = (
      prices.reduce((a, b) => (a += b)) / prices.length
    ).toFixed(2);
    MAP_PRODUCTS[params.cardName].total = (
      MAP_PRODUCTS[params.cardName].quantity * min
    ).toFixed(2);
  }
});

scraper.addParsingCallback("getCategory", function (data, params) {
  params.list.forEach((card) => {
    const toSearch = `https://www.cardmarket.com/fr/YuGiOh/Products/Search?searchString=[${card.name
      .toLowerCase()
      .replace(/ /gm, "+")}]&exactMatch=on&perSite=30`;
    params.cardName = card.name;
    console.log(`LOOKING FOR :: ${card.name}`);
    MAP_PRODUCTS[card.name] = {
      quantity: card.quantity,
      u_price: -1,
      average: -1,
      total: -1,
      id: card.id || "",
    };
    scraper.addRequest(toSearch, "parseCategory", {}, {...params});
  });
});

scraper.addParsingCallback("end", function () {
  let total = 0;
  let Atotal = 0;

  MAP_PRODUCTS = Object.keys(MAP_PRODUCTS)
    .filter((k) => MAP_PRODUCTS[k].u_price !== -1)
    .reduce((res, key) => ((res[key] = MAP_PRODUCTS[key]), res), {});
  console.log(
    ":: RESULTS :: looking for " +
      list.filter(
        (e, idx) => list.findIndex((el) => el.name === e.name) === idx
      ).length +
      " cards"
  );
  console.log(" -> Missing :: " + Object.keys(NOT_FOUND).length + " cards");
  Object.keys(NOT_FOUND).forEach((k) => console.log(k));
  console.log(" -> FOUNDED :: " + Object.keys(MAP_PRODUCTS).length + " cards");
  Object.keys(MAP_PRODUCTS).forEach((key) => {
    console.log(
      `${key} :: quantity: ${MAP_PRODUCTS[key].quantity} | lowest price: ${MAP_PRODUCTS[key].u_price} | average price: ${MAP_PRODUCTS[key].average} | total price (based on lowest): ${MAP_PRODUCTS[key].total}`
    );
    total += parseFloat(MAP_PRODUCTS[key].total);
    Atotal += parseFloat(MAP_PRODUCTS[key].average);
  });
  console.log("lowest total: " + total);
  console.log("average total: " + Atotal);
  process.exit(0);
});

const list = [
  { quantity: 1, name: "Cyber dragon", id: "op16-fr001" },
  { quantity: 2, name: "Red-Eyes Black Dragon" },
  { quantity: 3, name: "Red-Eyes Alternative Black Dragon" },
  { quantity: 1, name: "Red-Eyes Darkness Metal Dragon" },
  { quantity: 3, name: "Red-Eyes Black Flare Dragon" },
  { quantity: 2, name: "Meteor Dragon Red-Eyes Impact" },
  { quantity: 3, name: "Red-Eyes Archfiend of Lightning" },
  { quantity: 2, name: "Gearfried the Red-Eyes Iron Knight" },
  { quantity: 2, name: "Red-Eyes Baby Dragon" },
  { quantity: 3, name: "The Black Stone of Legend" },
  { quantity: 1, name: "Red-Eyes Retro Dragon" },
  { quantity: 2, name: "Red-Eyes Wyvern" },
  { quantity: 3, name: "Black Metal Dragon" },
  { quantity: 2, name: "Red-Eyes Insight" },
  { quantity: 2, name: "Cards of the Red Stone" },
  { quantity: 3, name: "Red-Eyes Fang with Chain" },
  { quantity: 2, name: "Red-Eyes Spirit" },
  { quantity: 2, name: "King of the Swamp" },
  { quantity: 2, name: "Polymerization" },
  { quantity: 2, name: "Red-Eyes Slash Dragon" },
  { quantity: 3, name: "Red-Eyes Flare Metal Dragon" },
  { quantity: 2, name: "Archfiend Black Skull Dragon" },
  { quantity: 2, name: "Darkness Metal, the Dragon of Dark Steel" },
  { quantity: 1, name: "Inferno Fire Blast" },
  { quantity: 1, name: "Return of the Red-Eyes" },
  { quantity: 1, name: "Red-Eyes Baby Dragon" },
  { quantity: 1, name: "Gearfried the Red-Eyes Iron Knight" },
];

(() => {
  const mylist = {};

  list.forEach((e) => {
    if (mylist[e.name]) {
      mylist[e.name].quantity += e.quantity;
    } else {
      mylist[e.name] = { ...e };
    }
  });
  scraper.logger.log("Starting program...");
  scraper.addRequest(
    "https://www.cardmarket.com/en/YuGiOh",
    "getCategory",
    {},
    { list: Object.keys(mylist).map((k) => mylist[k]) }
  );
})();
