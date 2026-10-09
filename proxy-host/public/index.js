const tabsElement = document.getElementById("tabs");
const pagesElement = document.getElementById("pages");
const addressInput = document.getElementById("address");
const statusElement = document.getElementById("status");
const tabs = [];
let activeTabId = null;
let controllerPromise = null;
let nextTabId = 1;
let statusTimer = null;

function notify(message) {
	statusElement.textContent = message;
	statusElement.classList.add("show");
	clearTimeout(statusTimer);
	statusTimer = setTimeout(() => statusElement.classList.remove("show"), 4500);
}

function activeTab() {
	return tabs.find((tab) => tab.id === activeTabId) ?? null;
}

function tabLabel(url) {
	if (!url) return "New tab";
	try {
		return new URL(url).hostname.replace(/^www\./, "") || "Browser";
	} catch {
		return "Browser";
	}
}

function updateTab(tab, url) {
	if (typeof url !== "string" || !url) return;
	try {
		const nextUrl = new URL(url);
		const previousUrl = tab.url ? new URL(tab.url) : null;
		// Keep the last good address when a proxied SPA omits the optional
		// history URL and Scramjet reports its current compatibility bug.
		if (
			previousUrl &&
			nextUrl.origin === previousUrl.origin &&
			nextUrl.pathname === "/undefined" &&
			previousUrl.pathname !== "/undefined"
		) {
			return;
		}
	} catch {
		return;
	}
	tab.url = url;
	tab.title = tabLabel(url);
	tab.button.querySelector(".tab-title").textContent = tab.title;
	if (tab.id === activeTabId) addressInput.value = url;
}

function activateTab(id) {
	activeTabId = id;
	for (const tab of tabs) {
		const current = tab.id === id;
		tab.tabButton.setAttribute("aria-selected", String(current));
		tab.button.classList.toggle("active", current);
		tab.page.classList.toggle("active", current);
	}
	const tab = activeTab();
	addressInput.value = tab?.url ?? "";
	addressInput.placeholder = tab?.frame ? "Search Brave or enter a website" : "Search Brave or enter a website";
}

function createTab() {
	const id = nextTabId++;
	const button = document.createElement("div");
	button.className = "tab";
	const selectButton = document.createElement("button");
	selectButton.className = "tab-select";
	selectButton.type = "button";
	selectButton.setAttribute("role", "tab");
	selectButton.setAttribute("aria-selected", "false");
	selectButton.setAttribute("aria-label", "New tab");
	selectButton.innerHTML = '<span class="tab-title">New tab</span>';
	selectButton.addEventListener("click", () => activateTab(id));
	const closeButton = document.createElement("button");
	closeButton.className = "tab-close";
	closeButton.type = "button";
	closeButton.setAttribute("aria-label", "Close tab");
	closeButton.title = "Close tab";
	closeButton.textContent = "×";
	closeButton.addEventListener("click", () => closeTab(id));
	button.append(selectButton, closeButton);
	button.addEventListener("keydown", (event) => {
		if (event.key === "Delete" && tabs.length > 1) closeTab(id);
	});

	const page = document.createElement("section");
	page.className = "page";
	page.setAttribute("role", "tabpanel");
	const welcome = document.createElement("div");
	welcome.className = "welcome";
	welcome.innerHTML = '<div class="welcome-mark" aria-hidden="true">⌕</div><h1>Search with Brave</h1><p>Enter a search or website address above.</p><div class="quick-links"><button class="quick-link" data-url="https://search.brave.com">Brave Search</button><button class="quick-link" data-url="https://www.youtube.com">YouTube</button><button class="quick-link" data-url="https://open.spotify.com">Spotify</button></div>';
	page.appendChild(welcome);
	page.querySelectorAll(".quick-link").forEach((link) => {
		link.addEventListener("click", () => navigate(link.dataset.url));
	});

	const tab = { id, title: "New tab", url: "", button, tabButton: selectButton, page, frame: null, iframe: null };
	tabs.push(tab);
	tabsElement.appendChild(button);
	pagesElement.appendChild(page);
	activateTab(id);
	addressInput.focus();
	return tab;
}

function closeTab(id) {
	const index = tabs.findIndex((tab) => tab.id === id);
	if (index < 0) return;
	const [tab] = tabs.splice(index, 1);
	tab.button.remove();
	tab.page.remove();
	if (tabs.length === 0) {
		createTab();
	} else if (activeTabId === id) {
		activateTab(tabs[Math.max(0, index - 1)].id);
	}
}

function getController() {
	if (!controllerPromise) controllerPromise = initBootstrap();
	return controllerPromise;
}

function resolveAddress(value) {
	const text = value.trim();
	if (!text) return null;
	if (/^https?:\/\//i.test(text)) return text;
	if (!/\s/.test(text) && /^(localhost|[\w-]+(?:\.[\w-]+)+)(?::\d+)?(?:\/[^\s]*)?$/i.test(text)) {
		return `https://${text}`;
	}
	return `https://search.brave.com/search?q=${encodeURIComponent(text)}`;
}

async function navigate(value) {
	const destination = resolveAddress(value);
	if (!destination) return;
	const tab = activeTab() ?? createTab();
	addressInput.value = destination;
	try {
		const controller = await getController();
		if (!tab.iframe) {
			tab.iframe = document.createElement("iframe");
			tab.iframe.title = "Browser tab";
			tab.iframe.referrerPolicy = "no-referrer";
			tab.page.replaceChildren(tab.iframe);
			tab.frame = controller.createFrame(tab.iframe, {
				plugins: [new $scramjetUtils.UrlWatcherPlugin((url) => updateTab(tab, url))],
			});
		}
		updateTab(tab, destination);
		await tab.frame.go(destination);
	} catch (error) {
		notify(error instanceof Error ? error.message : "The page could not be opened.");
	}
}

document.getElementById("address-form").addEventListener("submit", (event) => {
	event.preventDefault();
	navigate(addressInput.value);
});
document.getElementById("new-tab").addEventListener("click", createTab);
document.getElementById("back").addEventListener("click", () => activeTab()?.frame?.back());
document.getElementById("forward").addEventListener("click", () => activeTab()?.frame?.forward());
document.getElementById("reload").addEventListener("click", () => activeTab()?.frame?.reload());
document.addEventListener("keydown", (event) => {
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
		event.preventDefault();
		addressInput.focus();
		addressInput.select();
	}
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "t") {
		event.preventDefault();
		createTab();
	}
	if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "w" && tabs.length > 1) {
		event.preventDefault();
		closeTab(activeTabId);
	}
});

const initialUrl = new URL(window.location.href).searchParams.get("url");
createTab();
if (initialUrl) navigate(initialUrl);

