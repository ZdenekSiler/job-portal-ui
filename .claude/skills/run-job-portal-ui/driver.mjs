#!/usr/bin/env node
// Minimal headless-Chromium REPL driver (Playwright-based) for job-portal-ui.
// Reads commands line-by-line from stdin, one per line. Commands:
//   nav <url>
//   wait-for <selector>            (or "text=Some Text")
//   click <selector>
//   fill <selector> <value>
//   press <key>
//   screenshot [name.png]
//   eval <js expression>
//   console --errors
//   quit

import { chromium } from "playwright";
import { createInterface } from "node:readline";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION = process.env.SESSION || "default";
const SCREENSHOT_DIR = path.join(__dirname, "screenshots", SESSION);
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();

const consoleErrors = [];
page.on("console", (msg) => {
	if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

let shotCount = 0;
const rl = createInterface({ input: process.stdin });

for await (const line of rl) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) continue;
	const sp = trimmed.indexOf(" ");
	const cmd = sp === -1 ? trimmed : trimmed.slice(0, sp);
	const arg = sp === -1 ? "" : trimmed.slice(sp + 1);

	try {
		switch (cmd) {
			case "nav":
				await page.goto(arg, { waitUntil: "domcontentloaded" });
				break;
			case "wait-for":
				if (arg.startsWith("text=")) {
					await page.getByText(arg.slice(5), { exact: false }).first().waitFor({ timeout: 15000 });
				} else {
					await page.waitForSelector(arg, { timeout: 15000 });
				}
				break;
			case "click":
				await page.click(arg, { timeout: 10000 });
				break;
			case "fill": {
				const valSp = arg.indexOf(" ");
				await page.fill(arg.slice(0, valSp), arg.slice(valSp + 1));
				break;
			}
			case "press":
				await page.keyboard.press(arg);
				break;
			case "screenshot": {
				shotCount += 1;
				const name = arg || `${String(shotCount).padStart(2, "0")}.png`;
				const file = path.join(SCREENSHOT_DIR, name);
				await page.screenshot({ path: file, fullPage: true });
				console.log(`screenshot: ${file}`);
				break;
			}
			case "eval":
				console.log(await page.evaluate(arg));
				break;
			case "console":
				if (arg === "--errors") {
					console.log(consoleErrors.length ? consoleErrors.join("\n") : "(no console errors)");
				}
				break;
			case "quit":
				await browser.close();
				process.exit(0);
			default:
				console.log(`unknown command: ${cmd}`);
				continue;
		}
		console.log(`ok: ${trimmed}`);
	} catch (err) {
		console.log(`error: ${trimmed} -> ${err.message}`);
	}
}

await browser.close();
