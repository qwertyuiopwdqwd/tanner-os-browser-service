# Tanner-OS public browser service

This service hosts the Scramjet browser interface and its Wisp WebSocket endpoint on one HTTPS origin. The Tanner-OS page can embed the service after it has a public host URL.

The Wisp settings block private and loopback addresses, raw IP destinations, UDP streams, and non-web ports. Cross-origin WebSocket requests are rejected. These safeguards reduce exposure, but the service is still a public web proxy and can use the host's outbound bandwidth.

The Render blueprint uses the free web-service plan. Render documents that free services can sleep after inactivity and have monthly usage limits; a public proxy can hit those limits or be suspended. Review the Render plan and current billing settings before deployment.

The server uses Scramjet and Wisp packages from Mercury Workshop. The Scramjet project is licensed under AGPL-3.0-only: https://github.com/MercuryWorkshop/scramjet

