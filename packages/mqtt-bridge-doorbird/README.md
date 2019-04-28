# mqtt-bridge-doorbird

This is an MQTT Bridge that integrates with [Doorbird][doorbird] "smart"
doorbells. These doorbells offer a live camera feed, motion sensor, relays
and of course a doorbell button.

This bridge can be used to get image snapshots of whatever the camera sees at
any point, and also will provide them upon the doorbell being run, or any
motion events. The bridge can also activate any of the relays on the device.

This bridge does not require registering with any third party services. It uses
the local network API to interact with the devices.

This bridge does not provide any way to stream the video from Doorbird. That is
possible via using the RTSP stream on the device itself. See the [manual][manual]
for more.

[manual]: https://www.doorbird.com/downloads/api_lan.pdf?rev=0.21
[doorbird]: https://www.doorbird.com

## Setup

You MUST set the environment variables `DOORBIRD_USER`, and `DOORBIRD_PASS`.

You MAY set the environment variable `DOORBIRD_IP`. If not set the bridge will
attempt to discover the IP using `bonjour` discovery.

You MAY set the environment variable `MQTT_ROOT`. If not set it will default to
`doorbird`. The below documentation is written as if this is set to the default.

## Messages Published

The bridge will publish messages under `doorbird/_ID_` where `_ID_` is the WiFi
MAC address of the device, as noted in the literature when you receive the device.

The bridge will also publish to 3 sub-topics (`image`, `motion`, `doorbell`),
so in total these are all topics the bridge publishes to:

```
doorbird/_ID_ (QOS 0 Retained)
doorbird/_ID_/image (QOS 0 Retained)
doorbird/_ID_/motion (QOS 0 Retained)
doorbird/_ID_/doorbell (QOS 0 Retained)
```

The sub-topic messages are published for different events:

 - `doorbird/_ID_/motion` is published to whenever the device senses a motion event.
 - `doorbird/_ID_/doorbell` is published to whenever the doorbell button is pressed.
 - `doorbird/_ID_/image` is published to whenever the bridge first starts, and
   whenever a message of `doorbird/_ID_/image` is published with an empty
   payload. Effectively this is an on-demand "get what the camera currently
   sees" topic.

The payload of these subtopics includes consists of the binary bytes of a JPEG
snapshot of what the doorbell receives.

The "root" topic consists of a JSON payload describing a few details about the
device including the firmware version, available relays and the device name:

```
doorbird/DEADBEEFFADE (QOS 0 Retained)
{
  "FIRMWARE" : "000118",
  "BUILD_NUMBER" : "15514320",
  "WIFI_MAC_ADDR" : "DEADBEEFFADE",
  "RELAYS" : [ "1" ],
  "DEVICE-TYPE" : "DoorBird D101"
}
```

## Messages Accepted

This bridge will subscribe to `doorbird/#`. It will respond to messages of the
format `doorbird/_ID_/_COMMAND_` where `_ID_` is the ID of the device (as
described above), and `_COMMAND_` is one of the following commands:

  - `info` - Causes the bridge to refresh device information.
  - `image` - With an empty payload this will make the bridge retrieve the
    current image and post back to the topic `doorbird/_ID_/image` with the
    bytes of a JPEG snaphsot that the camera currently sees. The bridge ignores
    any `image` message with a payload to prevent recursion.
  - `light` - This activates the infrared LED, if the device is equipped with
    one. There is no way to turn this off, but it will turn off on its own
    after a period of time.
  - `restart` - This restarts the device
  - `relay` - This will activate one of the relays. The payload must contain
    a relay ID that is present in the `RELAYS` array in the JSON "root topic".

Some examples:


 - Turn light on:
  ```
  doorbird/DEADBEEFFADE/light (QOS 0)
  ```

 - Activate Relay 1
  ```
  doorbird/DEADBEEFFADE/relay (QOS 0)
  1
  ```

 - Get the current image snapshot from the camera
  ```
  doorbird/DEADBEEFFADE/image (QOS 0)
  ```
