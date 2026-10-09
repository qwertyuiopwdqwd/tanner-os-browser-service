import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const here = path.dirname(fileURLToPath(import.meta.url));
const { routeRequest, routeUpgrade } = await bootstrap();

// Public hosting must never allow a visitor to use this service to reach the
// host's private network or local services. Limit streams to ordinary web
// ports and disable UDP to reduce abuse and resource use.
Object.assign(wisp.options, {
	allow_private_ips: false,
	allow_loopback_ips: false,
	allow_direct_ip: false,
	allow_udp_streams: false,
	port_whitelist: [80, 443],
	stream_limit_total: 100,
	stream_limit_per_host: 10,
});

const app = express();
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.use((req, res, next) => {
	if (routeRequest(req, res)) return;
	next();
});
app.use(express.static(path.join(here, "public"), { extensions: ["html"] }));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
	if (!req.url?.startsWith("/wisp/")) {
		socket.destroy();
		return;
	}

	// The browser and Wisp endpoint are served from the same public origin.
	// Reject cross-origin browser embedding; non-browser clients can still forge
	// Origin, so this is an additional guard rather than authentication.
	const origin = req.headers.origin;
	const host = req.headers.host;
	if (!origin || !host || origin !== `https://${host}`) {
		socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
		socket.destroy();
		return;
	}

	if (!routeUpgrade(req, socket, head)) socket.destroy();
});

const port = Number(process.env.PORT || 3030);
server.listen(port, "0.0.0.0", () => {
	console.log(`Tanner-OS Browser listening on port ${port}`);
});

