# mqtt-bridge-darksky

This is an MQTT Bridge for the DarkSky weather API. It gives you information
about the current weather conditions in a given area, including cloud coverage,
change of precipitation, temperature, wind speed, humidity and more.

To use this bridge you will need to register with DarkSky, which requires an
email address.

## Setup

You MUST set the environment variables `DARKSKY_KEY`, `LATITUDE`, and
`LONGITUDE`. You can get a DarkSky API key by [registering with
DarkSky](https://darksky.net/dev/register).

You MAY set the environment variable `POLL_INTERVAL`. If not set this will
default to `240` seconds (4 minutes) which means this service will make around
360 requests per day. DarkSky allows for 1,000 API requests per day on their
free plan.

You MAY set the environment variable `MQTT_ROOT`. If not set it will default to
`darksky`. The below documentation is written as if this is set to the default.

## Messages Published

This bridge takes API responses from [DarkSky](https://darksky.net/) and
publishes the following topics:

```
darksky/daily (QOS 0 Retained)
darksky/hourly (QOS 0 Retained)
darksky/minutely (QOS 0 Retained)
darksky/currently (QOS 0 Retained)
```

Each topic payload is the contents of the [DarkSky Forecast Request
JSON](https://darksky.net/dev/docs#forecast-request) for the respective topic
name.

## Messages Accepted

This bridge will subscribe to `darksky/#`.  If you publish a message to
`darksky/#` (e.g.  `darksky/refresh`) then it will
invoke an additional manual request. 
