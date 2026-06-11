import { chromium } from "playwright";

const BASE = "http://localhost:5173";

// Static routes known to be registered in src/App.jsx
const STATIC_ROUTES = new Set([
	"/", "/jobs", "/companies", "/login", "/register", "/contact",
	"/profile", "/applied-jobs", "/saved-jobs", "/post-job", "/employer/jobs",
	"/admin", "/admin/companies", "/admin/employers", "/admin/contact-messages",
]);

function isInternalRouteValid(pathname) {
	if (STATIC_ROUTES.has(pathname)) return true;
	if (/^\/jobs\/[^/]+$/.test(pathname)) return true; // dynamic, validated at runtime via "Job Not Found" text
	if (/^\/companies\/[^/]+$/.test(pathname)) return true; // dynamic, validated at runtime
	if (/^\/job-applicants\/[^/]+$/.test(pathname)) return true;
	return false;
}

const externalLinkCache = new Map();
async function checkExternalLink(url) {
	if (externalLinkCache.has(url)) return externalLinkCache.get(url);
	let result;
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), 8000);
		let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
		if (res.status >= 400) {
			res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
		}
		clearTimeout(t);
		result = { ok: res.status < 400, status: res.status };
	} catch (err) {
		result = { ok: false, status: `ERROR: ${err.message}` };
	}
	externalLinkCache.set(url, result);
	return result;
}

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();

// 1. Get homepage links
await page.goto(BASE + "/", { waitUntil: "load" });
await page.waitForSelector('a[href="/jobs"]', { timeout: 15000 });
const homeLinks = await page.evaluate(() =>
	[...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"))
);

const internalPaths = new Set();
const externalUrls = new Set();
for (const href of homeLinks) {
	if (!href) continue;
	if (href.startsWith("http://") || href.startsWith("https://")) {
		if (!href.startsWith(BASE)) externalUrls.add(href);
	} else if (href.startsWith("/")) {
		if (href !== "/") internalPaths.add(href);
	}
}

console.log("Internal paths to crawl:", [...internalPaths]);
console.log("External links found on homepage:", [...externalUrls]);

const results = [];

for (const path of [...internalPaths]) {
	const url = BASE + path;
	const start = Date.now();
	let loadError = null;
	try {
		await page.goto(url, { waitUntil: "load", timeout: 20000 });
		await page.waitForSelector("h1, h2", { timeout: 10000 }).catch(() => {});
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	} catch (err) {
		loadError = err.message;
	}
	const loadTime = Date.now() - start;

	const data = await page.evaluate(() => {
		const h1 = document.querySelector("h1");
		const meta = document.querySelector('meta[name="description"]');
		const text = document.body.innerText || "";
		const words = text.trim().split(/\s+/).filter(Boolean);
		const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
		return {
			title: document.title,
			metaDescription: meta ? meta.getAttribute("content") : null,
			h1: h1 ? h1.textContent.trim() : null,
			wordCount: words.length,
			bodyTextSample: text.slice(0, 200),
			links,
		};
	});

	// Check links found on this page
	const brokenLinks = [];
	const seenOnPage = new Set();
	for (const href of data.links) {
		if (!href || seenOnPage.has(href)) continue;
		seenOnPage.add(href);
		if (href.startsWith("http://") || href.startsWith("https://")) {
			if (href.startsWith(BASE)) continue;
			const r = await checkExternalLink(href);
			if (!r.ok) brokenLinks.push(`${href} (${r.status})`);
		} else if (href.startsWith("/")) {
			const pathname = href.split("?")[0].split("#")[0];
			if (!isInternalRouteValid(pathname)) brokenLinks.push(`${pathname} (no matching route)`);
		} else if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
			// not checked
		}
	}

	// Detect "Not Found" pages for dynamic routes
	const notFound = /not found/i.test(data.bodyTextSample) || /not found/i.test(data.h1 || "");

	results.push({
		path,
		loadTime,
		loadError,
		title: data.title,
		metaDescription: data.metaDescription,
		h1: data.h1,
		wordCount: data.wordCount,
		brokenLinks,
		notFound,
	});
}

// Check external links on homepage too
const homeBroken = [];
for (const url of externalUrls) {
	const r = await checkExternalLink(url);
	if (!r.ok) homeBroken.push(`${url} (${r.status})`);
}

console.log("\n=== HOMEPAGE EXTERNAL LINKS ===");
for (const url of externalUrls) {
	const r = externalLinkCache.get(url);
	console.log(`${url} -> ${r.ok ? "OK" : "BROKEN"} (${r.status})`);
}

console.log("\n=== RESULTS ===");
console.log(JSON.stringify(results, null, 2));

await browser.close();
