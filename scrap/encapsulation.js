const puppeteer = require("puppeteer");
const Logger = require("@atic_c/multi-logger-js");
const { performance } = require("perf_hooks");

class Tool {
  requestsList = [];
  callbacks = {};
  params = {
    DELAY_MS: 1000,
    MAX_REQUESTS_PER_DELAY: 1,
    MAX_TIMEOUT: 20000,
    MAX_EMPTY_REQUESTS: 15,
  };
  totalRequests = 0;
  totalFails = 0;
  currentRequests = 0;
  puppeteerBrowser;
  logger;

  constructor(sitename, urlSite, p, useLog = true, logPath = "./") {
    const start = performance.now();
    this.params = { ...this.params, ...p, sitename, urlSite };
    if (useLog) {
      this.logger = new Logger(sitename, logPath || "./", true);
    }
    let emptyRequests = 0;
    const intervale = setInterval(() => {
      if (emptyRequests > this.params.MAX_EMPTY_REQUESTS) {
        this.endProcess(intervale, start);
        return;
      }
      try {
        const requests = this.requestsList.splice(
          0,
          this.params.MAX_REQUESTS_PER_DELAY
        );
        if (!requests || requests.length === 0) {
          emptyRequests += 1;
          return;
        }
        emptyRequests = 0;
        this.sendRequests(requests);
      } catch (e) {
        if (this.logger) this.logger.error(`Error :: ${e}`);
        this.endProcess(intervale, start, true);
        return;
      }
    }, this.params.DELAY_MS);
  }

  addParsingCallback(name, fct) {
    this.callbacks[name] = fct;
  }

  sendRequests(requests) {
    requests.forEach((req) => {
      const { url, callback, header, params, nbFails } = req;
      this.loadPage(url, callback, header, params, nbFails);
    });
  }

  addRequest(url, callback, header = {}, params = {}) {
    if (!url) {
      if (this.logger) this.logger.error("Error :: URL UNDEFINED");
      return;
    }
    if (url.substr(0, 4) !== "http") url = this.params.urlSite + url;
    this.requestsList.push({ url, callback, header, params, nbFails: 0 });
  }

  async loadPage(url, callback, header, params, nbFails) {
    this.totalRequests += 1;
    try {
      if (this.logger) {
        this.logger.log(`LOADING PAGE :: ${url}`);
      }
      const { htmlContent, responseHeaders } = await this.usePuppeteer(
        url,
        header
      );
      try {
        this.callbacks[callback](htmlContent, params, responseHeaders);
      } catch (e) {
        if (this.logger) {
          this.logger.error(`Parsing error [${url}] :: ${e}`);
        }
      }
    } catch (e) {
      if (this.logger) {
        this.logger.error(`Error -> ${e} :: ${url}`);
        if (e.response) if (e.response.status === "404") return;
        if (nbFails < 5)
          this.retryFailedRequest(nbFails, url, callback, header, params);
      }
    }
  }

  async usePuppeteer(url, headers) {
    const i = this.totalRequests;
    let page = undefined,
      browser = undefined;
    try {
      if (!this.puppeteerBrowser) {
        browser = await puppeteer.launch({
          ignoreHTTPSErrors: true,
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
          defaultViewport: { width: 1322, height: 797 },
        });
        this.puppeteerBrowser = browser.wsEndpoint();
      }
      browser =
        browser ||
        (await puppeteer.connect({ browserWSEndpoint: this.puppeteerBrowser }));
      page = await browser.newPage();
      page.setDefaultTimeout(this.params.MAX_TIMEOUT);
      if (Object.keys(headers).length !== 0 && headers.constructor === Object)
        page.setExtraHTTPHeaders(headers);
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (req.resourceType() === "image") req.abort();
        else req.continue();
      });
      const resp = await page.goto(url);
      await page.waitForTimeout((i % 5) * 100 + 1000);
      const htmlContent = await page.content();
      const responseHeaders = resp.headers();
      await page.close();
      browser.disconnect();
      return { htmlContent, responseHeaders };
    } catch (e) {
      if (page) await page.close();
      throw new Error(e);
    }
  }

  retryFailedRequest(nbFails, url, callback, header, params) {
    nbFails += 1;
    this.totalFails += 1;
    this.requestsList.push({
      url,
      callback,
      header,
      params,
      nbFails,
    });
  }

  async endProcess(i, start, crash = false) {
    clearInterval(i);
    if (this.logger)
      this.logger.info(
        JSON.stringify({ total: this.totalRequests, fails: this.totalFails })
      );
    if (this.puppeteerBrowser) {
      const browser = await puppeteer.connect({
        browserWSEndpoint: this.puppeteerBrowser,
      });
      await browser.close();
    }
    if (this.callbacks["end"]) this.callbacks["end"]();
    const end = performance.now();
    if (crash && this.logger)
      this.logger.error(`PROCESS CRASHED ! (time spent: ${end - start}ms)`);
    else if (this.logger) this.logger.info(`PROCESS ENDED :: ${end - start}ms`);
    process.exit(crash ? 84 : 0);
  }
}

module.exports = Tool;
