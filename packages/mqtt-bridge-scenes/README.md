# mqtt-bridge-scenes

This is an MQTT Bridge that outputs simple strings; changing them when it
receives commands to change them.

This bridge can be used to create "scenes" for home automation software,
where a change to a scene can trigger a change in behavior of other devices.

It can also be used as part of a Finite State Machine, as essentially it stores
a state which can be retrieved and changed with commands. FSM might be useful
for such devices as house alarms, moving between the "unarmed", "pending", and
"alarmed" states.

This bridge does not require registering with any third party services.

## Setup

You MUST set the environment variable `SCENE_FILE` to a path on the file system
that exists. The bridge will attempt to read from this file to use as scene
information. The file should be a JSON Object consisting of "scenes", each of
which should have an array of unique modes; for example:

```json
{
  "scene1": ["mode1", "mode2", "mode3"]
}
```

A more realistic example might be:

```json
{
  "away": ["away", "home"],
  "alarm": ["disarmed", "pending", "armed", "triggered"]
}
```

You MAY set the environment variable `MQTT_ROOT`. If not set it will default to
`scenes`. The below documentation is written as if this is set to the default.

## Messages Published

Every "scene" inside of the JSON file will be published under `scenes/_SCENE_`
where `_SCENE_` is the name of the scene. The payload will be the first "mode"
(the first string in the array). So for example the above file will generate
these two messages:

```
scenes/away (QOS 0 Retained)
away
```

```
scenes/alarm (QOS 0 Retained)
disarmed
```

## Messages Accepted

This bridge will subscribe to `scenes/#`. It will respond to messages of the
format `scenes/_SCENE_/_COMMAND_` where `_SCENE_` is the name of a scene, and
`_COMMAND_` is one of the following commands:

  - `set` - Change the scene to the contents of the payload (provided the
    payload matches the name of one of the "modes").
  - `cycle` - Sets the scene to the next mode in the list.

When one of these commands is run, the scene will change to the desired mode,
the bridge will publish a new message under `scenes/_SCENE_ (QOS 0 Retained)`
with the payload set to the new mode, and the scenes file is re-written to
reflect this change. The order of the array is kept so that `cycle` will always
change to the "next mode", based on the JSON as was originally authored.

As an example:

```
scenes/alarm/set (QOS 0)
armed
```

Will publish `scenes/alarm (QOS 0 Retained)` with a payload of `armed` and the
scenes file will now contain:

```json
{
  "away": ["away", "home"],
  "alarm": ["armed", "triggered", "disarmed", "pending"]
}
```

Publishing `scenes/alarm/cycle` with an empty payload will now cycle the mode, so
that `scenes/alarm (QOS 0 Retained)` is published again but with a payload of
`triggered`, and the scenes file now contains:

```json
{
  "away": ["away", "home"],
  "alarm": ["triggered", "disarmed", "pending", "armed"]
}
```

It is important that the scene file is written to, as this allows the bridge to
survive crashes and restarts. It would be very unfortunate if the bridge
crashing would reset any scenes.
