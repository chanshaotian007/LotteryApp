# Data Sources

Supported games in the first release:

- `ssq`: Double Color Ball history from China Welfare Lottery public draw-notice endpoints. The client uses browser-like headers because the endpoint may be protected by WAF behavior. If JSON is unavailable, an announcement-page parsing fallback records the source URL and response hash.
- `dlt`: Super Lotto history from the China Sports Lottery public history API with `gameNo=85`. The server paginates this source in 100-record pages and de-duplicates issues when a larger sync limit is requested.

For every stored draw, the server keeps:

- game code and issue
- draw date when available
- primary and secondary winning numbers
- prize-tier payload when available
- source URL
- SHA-256 hash of the raw source payload
