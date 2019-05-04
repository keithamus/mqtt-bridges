# mqtt-bridge-googlecast

This is an MQTT Bridge that discovers [Google Cast][gcast] devices on your
local network, and allows control of them via MQTT messages.

[gcast]: https://www.google.com/intl/en_us/chromecast/built-in/

This bridge can be used to cast MP3 files to the Google Cast devices, as well
as control settings and more.

This bridge does not require registering with any third party services, does
not require access to "cloud" services, but it does require Google Cast devices
to be on the same network as the service.

## Setup

You MAY set the environment variable `MQTT_ROOT`. If not set it will default to
`googlecast`. The below documentation is written as if this is set to the default.

## Messages Published

This bridge emits messages ....

```
googlecast/_ID_ (QOS 0 Retained)
```

Example response:

```json
```

## Messages Accepted

This bridge will subscribe to `googlecast/#`.  If you publish a message to `googlecast/_ID_/#`
(e.g.  `googlecast/_ID_/refresh`) then...
