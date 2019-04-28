# mqtt-bridge-lifx

This is an MQTT Bridge for Lifx brand light bulbs, or another devices that use
the Lifx local network API (including homebrew lifx devices). It gives you
information about each light connected to your network, as well as allowing you
to control each light by publishing commands to the device topics.

To use this bridge you will need to own Lifx (or compatible) lights. This does
not use the Lifx Cloud Account, so you will _not_ need to provide your details
to Lifx to use this integration.

It uses [`node-lifx`](https://npm.im/node-lifx) under the hood.

## Setup

You MAY set the environment variable `POLL_INTERVAL`. If not set this will
default to `5` seconds. This is how often this service will _check each light_
to see if its state has changed. It is not guaranteed to publish messages on
every poll, as it will only publish if the light changes state between the last
publish.

You MAY set the environment variable `MQTT_ROOT`. If not set it will default to
`lifx`. The below documentation is written as if this is set to the default.

## Messages Published

This bridge discovers lights on the same LAN as the service that is running.
Once discovered, it will check the lights every few seconds (defined by
`POLL_INTERVAL`) and publish messages under `lifx/DEVICE_ID`, `QOS 0 Retained`.

The payload for these messages is the JSON representation of the lights state,
including the full color "hue", "saturation", "brightness", and "kelvin", the
lights name, vendor, and product features, and the firmware version.

As an example, you might see the following message:

```
lifx/do73ddeadbee (QOS 0 Retained)
{
  "id" : "d073ddeadbee",
  "color" : {
    "hue" : 0,
    "saturation" : 0,
    "brightness" : 20,
    "kelvin" : 2500
  },
  "power" : 0,
  "label" : "Living Room",
  "vendorId" : 1,
  "productId" : 22,
  "version" : 0,
  "vendorName" : "LIFX",
  "productName" : "Color 1000",
  "productFeatures" : {
    "color" : true,
    "infrared" : false,
    "multizone" : false
  },
  "majorVersion" : 1,
  "minorVersion" : 22
}
```

## Messages Accepted

This bridge will subscribe to `lifx/#`. It will respond to messages of the
format `lifx/_ID_/_COMMAND_` where `_ID_` is the ID of a _known light_, and
`_COMMAND_` is one of the following commands:

  - `on` - Turns the light on. If given a payload, it will attempt to parse
    this as the number of milliseconds to fade the light in over.
  - `off` - Turns the light off. If given a payload, it will attempt to parse
    this as the number of milliseconds to fade the light in over.
  - `color` - Turns the light to a particular color. This must be given a JSON
    Array formatted payload consisting of 6 numbers: hue, saturation,
    brightness, kelvin, and delay (the number of milliseconds to fade to this
    color).
  - `colorRgb` - Like `color` but instead of a 6 number array, you can pass it
    a 4 number array consisting of: Red, Green, Blue and delay (the number of
    milliseconds to fade to this color).
  - `colorRgbHex` - Like `color` but can take a string, consisting of a
    hexadecimal color (e.g. `#ff0000`), or an array with both the hex string
    and delay (the number of milliseconds to fade to this color).
  - `maxIR` - Sets the maximum infrared brightness of the light, if the light
    supports infrared (you can see if it does by checking the `productFeatures`
    object). 
  - `setLabel` - This can be used to rename the light (the `label` property).
    Whatever is in the payload will be used to set the light. The maximum
    length of a label is 32 characters, so providing a payload with more than
    32 characters will not work.

Sending any of these commands will also cause the bridge to subsequently
refresh the retained message, with the new information reflected.

Some examples:


 - Turn light off:
  ```
  lifx/do73ddeadbee/off (QOS 0)
  ```

 - Turn light to red:
  ```
  lifx/do73ddeadbee/colorRgbHex (QOS 0)
  #ff0000
  ```

 - Fade light to red over 1 second
  ```
  lifx/do73ddeadbee/colorRgbHex (QOS 0)
  ["#ff0000", 1000]
  ```
