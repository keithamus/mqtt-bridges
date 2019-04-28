# Why MQTT? Why not X?

## What do I want from Home Automation?

The most important thing for Home Automation is to actually _automate_ the
home. The holy grail is not having to operate the home, but have the home know
what I want to do; when I enter a room, if its dark then switch the lights on;
as I walk up to a door unlock it; dim the lights as it gets towards bed time.

Many services fall down here, as the automation aspect is either too limited,
too cumbersome or just doesn't exist.

### Vendor Apps

The first Home Automation product I purchased were a set of Lifx lightbulbs.
These work over WiFi and the app allows you to control how the lights operate -
you can change the dimming and colour of the lights. The promise of this was
that instead of getting up to turn a light switch on, you could just take your
phone out of your pocket and open an app! The problem with these is to turn
them on you have to take your phone out of your pocket and open an app; which
usually takes a lot longer than simply getting up and turning the light switch
on and off.

Of course every vendor has their own app, so when it came to installing
different lights, I needed a different app, and things get a little more
complicated. My partner and I end up having conversations like

 - "What app is the living room lamp on?"
 - "Thats a Lifx Bulb, use the Lifx app"
 - "Okay now what app do I use for the kitchen lights?"
 - "They're on vera, open your browser and go to 192.168.."

There just had to be a better way...

### Assistants

The next phase was purchasing Google Home. This product allows you to speak
commands, and integrates with all of your favourite devices, like Lifx! Simply
say "okay google, turn off the living room" and voilà, the light turns off.
However Google Home really does not work as well as advertised, in fact getting
it to do anything is more of an exercise in frustration. The conversation
usually goes something like this:

 - "Okay google, turn off the living room lamp"
 - "Sure, turning _on_ the living room lamp"
 - "No; turn OFF the living room lamp"
 - "I'm sorry, power controls are not yet supported"
 - "What?! This worked yesterday... 'okay google, turn off the living room lamp"
 - "Playing 'When I turn off the living room light by The Kinks on Spotify'"
 - "OKAY GOOGLE STOP. Let's try this one more time. Okay Google, TURN. OFF. THE. LIVING. ROOM. LAMP"
 - ".... turning off the living room lamp"

When trying to work out what I'm doing wrong, the usual response is "try
changing the phrase, or lowering your voice, or standing on one leg, tilt your
head 90 degrees and face towards the Orion's belt".

There just had to be a better way...

### Home Assistant

Soon after this, I discovered [Home Assistant (or HASS for short)][hass]. HASS
promises to be an open source home automation platform, that you can run
locally - can blend in with your current workflows, and actually _automate_
your home. HASS is all open source so if you want an integration like Lifx,
there's a good chance someone had written it, and if not - well I'm a
programmer, I could write it myself! HASS also allows you to create custom
scripts via YAML which react to events and turn on or off devices. At first
HASS seemed hugely liberating, it had a reasonable looking dashboard interface
but more importantly the scripting worked well enough that now - I could enter
a room and the lights just came on, without chanting incantations to Google
Home or getting out my phone yet again!

As my desired for automation got more complex, I realised that HASS had really
put me into a box; all the integrations were confined to HASS' platform, and
there was no external API, only YAML (or Python if you go deep enough). This
meant writing over 300 lines of YAML over multiple days to automate my window
blinds (seriously, [over 300 lines of YAML][blindsyaml]). I spend hours reading
the forums trying to find out how to do things like date formatting, so I could
[transition lights over time][lightsyaml]. I started to think how much easier
this would all be if I could just use a full featured programming language.
Meanwhile I watched as some integrations [took over a year from PR to
release][hassnissanleafpr], and with no other way to put my own integrations
the platform in a first-class manner into it all became a bit of a turn off.

There just had to be a better way...

### MQTT

During my programming career I'd worked on Home Automation devices before, and
had implemented MQTT in embedded devices to connect to data centres. During
that time I fell in love with MQTT, it was a robust spec, incredibly
lightweight, able to handle vast traffic and robust enough to handle network
drop outs.

That's when this project was born.

HASS has integration with MQTT, and so I decided I could start writing my own
MQTT integrations which don't rely on HASS in any way. That way if I want to
write automations on top, I can simply write code that listens on one MQTT
topic and sends messages on another.

Then I discovered [node-red][nodered] which is a visual programming environment
for exactly that; it listens to messages coming in, and using "blocks", I can
create simple scripts to process messages and set out new ones. Now all of a
sudden my 300 lines of YAML is less than 20 blocks. Other automations which
seemed insurmountable are now reasonable.

There's probably a better way, but this way works pretty darn well for me now.

[hass]: https://www.home-assistant.io
[MQTT]: https://mqtt.org
[blindsyaml]: https://gist.github.com/keithamus/ac53a5aecc009082d97e95112bff73b7
[lightsyaml]: https://gist.github.com/keithamus/38b63eedac815cf3c9b4a1878842350b
[hassnissanleafpr]: https://github.com/home-assistant/home-assistant/pull/19786/commits/fb561ddb40b62b00b09951fd23dadb28ee5ac693
[HLS]: https://en.wikipedia.org/wiki/HTTP_Live_Streaming
