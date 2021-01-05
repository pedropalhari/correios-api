/// <reference path="./lib.dom.d.ts" />
import puppeteer from "https://deno.land/x/puppeteer@5.5.1/mod.ts";
import { opine } from "https://deno.land/x/opine@1.0.2/mod.ts";

const app = opine();
const browser = await puppeteer.launch({
  headless: true,
});

const __dirname = new URL(".", import.meta.url).pathname;

app.get("/:objectUUID", async (req, res) => {
  let { objectUUID } = req.params;

  if (!objectUUID) {
    res.json({
      error: "ObjectUUID is currently undefined",
    });
  }

  let objectStatus = await getInfo(objectUUID);

  return res.json({ objectStatus });
});

// console.log(await getInfo("ON214891784BR"));

async function getInfo(packageUUID: string) {
  const page = await browser.newPage();

  await page.goto(
    "https://www2.correios.com.br/sistemas/rastreamento/default.cfm"
  );

  await page.type("#objetos", packageUUID);
  await page.click("#btnPesq");

  await page.waitForSelector(
    "body > div.back > div.tabs > div:nth-child(2) > div > div > div.column2 > div.content.trescolunas > div.tituloimagem"
  );

  let dates = await page.evaluate(() => {
    let dateArray = Array.from(
      document.querySelectorAll(".sroDtEvent") as NodeListOf<HTMLSpanElement>
    ).map((x) => x.innerText);

    return dateArray;
  });

  let events = await page.evaluate(() => {
    let eventArray = Array.from(
      document.querySelectorAll(".sroLbEvent") as NodeListOf<HTMLSpanElement>
    ).map((x) => x.innerText);

    return eventArray;
  });

  await page.close();

  //Arruma a formatação estranha da página:

  interface IDate {
    date: string;
    hour: string;
    city: string;
  }

  interface IEvent {
    status: string;
    info: string;
  }

  let datesObject: IDate[] = dates.map((date) => {
    let dateInfoArray = date.split("\n").map((d) => d.trim());
    dateInfoArray = dateInfoArray.filter((d) => d != "");
    return {
      date: dateInfoArray[0],
      hour: dateInfoArray[1],
      city: dateInfoArray[2],
    };
  });

  let eventsObject: IEvent[] = events.map((event) => {
    let eventInfoArray = event.split("\n").map((d) => d.trim());
    eventInfoArray = eventInfoArray.filter((d) => d != "");
    return {
      status: eventInfoArray[0],
      info: eventInfoArray[1],
    };
  });

  // Merge the dates and events
  let fullObject = datesObject.map((date, index) => ({
    ...date,
    ...eventsObject[index],
  }));

  return fullObject;
}

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
