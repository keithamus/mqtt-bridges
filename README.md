# MQTTBridge

MQTTBridge takes common Internet of Things platforms and bridges them to using the MQTT protocol.

MQTTBridge is a light weight Node.js server, which you can run on your home network alongside any MQTT Broker. Install additional plugins to connect to third party APIs, which get converted into messages to send to your MQTT Broker.

The point of this is to centralise all of the "smart devices" in your home through an MQTT server, which offers a single, universal platform for all Internet of Things events.

## Why MQTT?

The benefit of pushing everything through MQTT is:

 - One single, open protocol for all devices
 - Not coupled to a "platform" like SmartThings, HomeKit etc
 - Lightweight protocol, can be used natively on homebrew devices
 - Application Layer protocol; transport layer agnostic

Essentially almost all home automation devices fit into one of two categories: sensors where you collect information about the physical environment, and actuators, where you control the physical environment. Almost invariably you actuate things based on sensor data, so what we really have on our hands is an _evented system_ or _message queue_.

There are few exceptions to the above, where MQTT isn't a good fit

  - Historical/timeseries data. Time series databases such as [Prometheus][Prometheus], [Graphite][Graphite], or [InfluxDB][InfluxDB] is a better fit for this. MQTTBridge supports "metrics" plugins which can provide data to these databases so they can be graphed. See the [metrics documentation](./docs/metrics) for more on this.
  - Streaming video/audio. Technologies such as [RTSP][RTSP], or [HLS][HLS] is a better fit for this.

## Bridges (aka Integrations)

Bridges have been written for the following services:


 - [mqtt-bridge-darksky](./packages/mqtt-bridge-darksky) provides [DarkSky](https://darksky.net/) weather report data
 - [mqtt-bridge-doorbird](./packages/mqtt-bridge-doorbird) integrates [Doorbird](https://www.doorbird.com) smart doorbells
 - [mqtt-bridge-googlecast](./packages/mqtt-bridge-googlecast) integrates [Google Cast](https://www.google.com/intl/en_us/chromecast/built-in/) devices
 - [mqtt-bridge-flux](./packages/mqtt-bridge-flux) provides calculated colour temperature to automate light brightness, based on [f.lux](https://justgetflux.com)
 - [mqtt-bridge-lifx](./packages/mqtt-bridge-lifx) integrates [Lifx](https://www.lifx.com) light bulbs
 - [mqtt-bridge-scenes](./packages/mqtt-bridge-scenes) provides simple way to manage "Scenes" or State Machines (like an Alarm System)
 - [mqtt-bridge-suncalc](./packages/mqtt-bridge-suncalc) provides sun/moon position/phase data, using [the Suncalc npm library](https://www.npmjs.com/suncalc)
 - [mqtt-bridge-tesla](./packages/mqtt-bridge-tesla) integrates the [Tesla API](https://www.teslaapi.io) for [Tesla Electric Vehicles](https://www.tesla.com)
 - [mqtt-bridge-vera](./packages/mqtt-bridge-vera) integrates the [Vera Zwave Hub](https://getvera.com) for z-wave devices


Also in the packages directory:

 - [mqtt-bridge-utils](./packages/mqtt-bridge-utils) this is a utility package to make writing integrations easier.
 
Plugins TODO:

 - [mqtt-bridge-unifi](./packages/mqtt-bridge-unifi) integrates [Unifi Controller](https://unifi.ubnt.com/) for Switches, APs, and client presence.
 - [mqtt-bridge-unifiprotect](./packages/mqtt-bridge-unifiprotect) integrates [Unifi Protect](https://unifi-protect.ui.com/) for Camera motion.
 - [mqtt-bridge-airplay](./packages/mqtt-bridge-airplay) integrates [AirPlay](http://nto.github.io/AirPlay.html) devices.
 - [mqtt-bridge-orbitip](./packages/mqtt-bridge-orbitip) integrates [Gemini2000 Orbit IP NFC Readers](https://www.gemini2k.com/orbit-ip-poe-nfc-smart-card-reader/) NFC readers.
 - [mqtt-bridge-heatmiserneo](./packages/mqtt-bridge-heatmiserneo) integrates the [Heatmiser Neo Thermostats](https://www.heatmiser.com/en/neo-smart-thermostat/) via the NeoHub Bridge.
 - [mqtt-bridge-webserver](./packages/mqttbridge-webserver) provides a web interface to view the status of the bridge.
 - [mqtt-bridge-prometheus](./packages/mqttbridge-prometheus) provides an endpoint for Prometheus time series database to scrape.
 - [mqtt-bridge-fastdotcom](./packages/mqtt-bridge-fastdotcom) regular internet speed checks using [fast.com](https://fast.com)

[InfluxDB]: https://www.influxdata.com/
[Prometheus]: https://prometheus.io/
[Graphite]: https://www.graphite.com/
[RTSP]: https://en.wikipedia.org/wiki/Real_Time_Streaming_Protocol
[HLS]: https://en.wikipedia.org/wiki/HTTP_Live_Streaming
