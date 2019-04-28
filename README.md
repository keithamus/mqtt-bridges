# mqtt-bridges

These bridges take common IOT platforms and bridge them to using the MQTT
protocol.

The point of this is to centralise all of the "smart devices" in my home
through my MQTT server, which offers a single, universal platform for all
IOT events.

The benefit of pushing everything through MQTT:

 - One single, open protocol for all devices
 - Not coupled to a "platform" like SmartThings, HomeKit etc
 - Lightweight protocol, can be used natively on homebrew devices
 - Application Layer protocol; transport layer agnostic

Essentially almost all home automation devices fit into one of two categories:
sensors where you collect information about the physical environment, and
actuators, where you control the physical environment. Almost invariably you
actuate things based on sensor data, so what we really have on our hands is an
_evented system_ or _message queue_.

There are few exceptions to the above, where MQTT isn't a good fit

  - Historical/timeseries data. [InfluxDB][InfluxDB] is a better fit for this
  - Streaming video/audio. [HLS][HLS] is a better fit for this.

 - Home automation requires sensors, and data from those sensors
 - Home automation requires actuators, and a way to control those actuations

For more details on why I chose MQTT, or more precisely why I'm not using any
of the other myriad of platforms - take a look at [why.md]

## Bridges (or "Integrations")

I've written integrations for many "smart"/IOT products I own, with many more
to come still. Here's the list that exists in this repo:


 - [mqtt-bridge-darksky](./packages/mqtt-bridge-darksky) provides [DarkSky](https://darksky.net/) weather report data
 - [mqtt-bridge-doorbird](./packages/mqtt-bridge-doorbird) integrates [Doorbird](https://www.doorbird.com) smart doorbells
 - [mqtt-bridge-flux](./packages/mqtt-bridge-flux) calculates colour temperature to automate light brightness, based on [f.lux](https://justgetflux.com)
 - [mqtt-bridge-lifx](./packages/mqtt-bridge-lifx) integrates [Lifx](https://www.lifx.com) light bulbs
 - [mqtt-bridge-scenes](./packages/mqtt-bridge-scenes) a simple way to manage "Scenes" or State Machines (like an Alarm System)
 - [mqtt-bridge-suncalc](./packages/mqtt-bridge-suncalc) provides sun/moon position/phase data, using [the Suncalc npm library](https://www.npmjs.com/suncalc)
 - [mqtt-bridge-tesla](./packages/mqtt-bridge-tesla) integrates the [Tesla API](https://www.teslaapi.io) for my [Tesla EV](https://www.tesla.com)
 - [mqtt-bridge-vera](./packages/mqtt-bridge-vera) integrates the [Vera Zwave Hub](https://getvera.com) for z-wave devices

Also in the packages directory:

 - [mqtt-bridge-utils](./packages/mqtt-bridge-utils) this is a utility package to make writing integrations easier.

[why.md]: ./docs/why.md
