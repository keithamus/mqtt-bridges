# mqtt-bridge-flux

This is an MQTT Bridge that regularly outputs brightness/temperature
infromation, similar to the [f.lux](https://justgetflux.com) app for MacOS.

This bridge can be used to adjust the temperature of your lights or screens to
follow your circadian rhythm. The bridge will output colour temperatures which
start out quite "blue" and get progressively more "red" as the day heads
towards night.

This bridge does not require registering with any third party services.

## Setup

You MUST set the environment variables `LATITUDE`, and `LONGITUDE`.

You MAY set the environment variable `POLL_INTERVAL`. If not set this will
default to `5` seconds which means this service will make publish around 17,280
messages a day to your MQTT broker.

You MAY set the environment variable `MQTT_ROOT`. If not set it will default to
`flux`. The below documentation is written as if this is set to the default.

## Messages Published

This bridge emits messages to one topic:

```
flux/flux (QOS 0 Retained)
```

The payload will be a JSON formatted object with the following fields:

 - `t`: the current time as a String
 - `brightness`: a suggested brightness, a Number between 0 and 100
 - `k`: a suggested color temperature in Kelvin, it is a positive number ranging between 2400-5500 (unless modified, see below)
 - `rgb`: the `k` value converted into RGB colour, this is an Array of 3 Numbers ranging from 0-255
 - `hex`: the `k` value converted to HEX colour, this is a 7 character hexadecimal String - a leading `#` followed by 6 hexadecimal characters

Example response:

```json
{
  "t" : "2019-04-10T16:36:00.819Z",
  "brightness" : 0,
  "k" : 2400,
  "rgb" : [ 255, 155, 61 ],
  "hex" : "#ff9b3d"
}
```

## Messages Accepted

This bridge will subscribe to `flux/#`.  If you publish a message to `flux/flux/#`
(e.g.  `flux/flux/refresh`) then it will invoke an additional manual request. 

The following messages have special behavior:

```
flux/flux/maxbrightness
```

The expected payload is a JSON Number. This will change the max brightness the
`brightness` value can go up to. This is useful to cap the maximum brightness
of your lights, for example.

```
flux/flux/minbrightness
```

The expected payload is a JSON Number. This will change the min brightness the
`brightness` value can go up to. This is useful to keep all lights set to a
minimum brightness, for example.

```
flux/flux/maxk
```

The expected payload is a JSON Number. This will change the max kelvin the `k`
value can go up to. This is useful if you want to keep your lights from going
to the full white colour of 5500k (or increase it to 9500K or higher)

```
flux/flux/mink
```

The expected payload is a JSON Number. This will change the min kelvin the `k`
value can go up to. This is useful if you want to keep your lights from going
too "red" of 2400k, for example you might want them only going as low as 3000k,
or perhaps even lower to 1700k.
