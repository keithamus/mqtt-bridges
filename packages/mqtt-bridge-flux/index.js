import mqtt from 'mqtt-bridge-utils'
import suncalc from 'suncalc'
import delay from 'delay'
import forever from 'p-forever'


const timeFactor = (s, t, e) => (1/(e-s))*(t-s)

const easeIn = p => t => t ** p
const easeOut = p => t => 1 - Math.abs((t-1) ** p)
const easeInOut = p => t => t<.5 ? easeIn(p)(t*2)/2 : easeOut(p)(t*2-1)/2+0.5

const linear = t => t
const easeInQuad = easeIn(2)
const easeOutQuad = easeOut(2)
const easeInOutQuad = easeInOut(2)
const easeInCubic = easeIn(3)
const easeOutCubic = easeOut(3)
const easeInOutCubic = easeInOut(3)
const easeInQuart = easeIn(4)
const easeOutQuart = easeOut(4)
const easeInOutQuart = easeInOut(4)
const easeInQuint = easeIn(5)
const easeOutQuint = easeOut(5)
const easeInOutQuint= easeInOut(5)
const easeInSin = t => 1 + Math.sin(Math.PI / 2 * t - Math.PI / 2)
const easeOutSin = t => Math.sin(Math.PI / 2 * t)
const easeInOutSin = t => (1 + Math.sin(Math.PI * t - Math.PI / 2)) / 2

const clamp = (i, max, min = 0) => Math.round(Math.max(Math.min(i, max), min))
const ktorgb = k => (k /= 100) > 66 ? 
  [
    clamp(329.698727446 * ((k - 60) ** -0.1332047592), 255),
    clamp(288.1221695283 * ((k - 60) ** -0.0755148492), 255),
    255
  ] : [
    255,
    clamp(99.4708025861 * Math.log(k,  2.718) - 161.1195681661, 255),
    clamp(138.5177312231 * Math.log(k - 10, 2.718) - 305.0447927307, 255)
  ]
const rgbtohex = ([r, g, b]) => `#${r.toString(16)}${g.toString(16)}${b.toString(16)}` 
const getFlux = (time, maxB, minB, maxK, minK) => {
  const times = suncalc.getTimes(time, Number(process.env.LATITUDE), Number(process.env.LONGITUDE))
  const midnight = new Date()
  midnight.setHours(23, 59, 59, 999)
  const sunrise = new Date(times.sunrise)
  sunrise.setDate(time.getDate()) // sometimes a bug happens with SunCalc where sunrise is yesterday
  const noon = new Date(times.solarNoon)
  noon.setDate(time.getDate()) // sometimes a bug happens with SunCalc where noon is yesterday
  let brightness = minB
  let k = minK
  if (time > sunrise && time < noon) {
    brightness = minB + ((maxB - minB) * easeOutCubic(timeFactor(sunrise, time, noon)))
    k = minK + ((maxK - minK) * easeInOutQuart(timeFactor(sunrise, time, noon)))
  } else if (time >= noon && time < midnight) {
    brightness = minB + ((maxB - minB) * (1 - easeInQuad(timeFactor(noon, time, midnight))))
    k = minK + ((maxK - minK) * (1 - easeOutQuad(timeFactor(noon, time, midnight))))
  }
  k = Math.round(clamp(k, maxK, minK)/100)*100
  brightness = clamp(brightness, maxB, minB)
  return {
    t: time,
    brightness,
    k,
    rgb: ktorgb(k),
    hex: rgbtohex(ktorgb(k))
  }
}


const main = async (config) => {
  let maxB = 100
  let minB = 0
  let maxK = 5500
  let minK = 2400
  const {LATITUDE, LONGITUDE, POLL_INTERVAL = 5} = config
  let lastBrightness = NaN
  let lastK = NaN
  const refresh = async () => {
    const flux = getFlux(new Date(), maxB, minB, maxK, minK)
    if (flux.brightness !== lastBrightness || flux.k !== lastK) {
      lastBrightness = flux.brightness
      lastK = flux.k
      mqpub('flux', flux)
    }
    await delay(POLL_INTERVAL * 1000)
  }
  const mqpub = await mqtt(config, async (id, command, payload) => {
    if (id !== 'flux') return
    switch (command) {
      case 'maxbrightness':
        maxB= Number(payload)
        break;
      case 'minbrightness':
        minB= Number(payload)
        break;
      case 'maxk':
        maxK = Number(payload)
        break;
      case 'mink':
        minK = Number(payload)
        break;
    }
    await refresh()
  })
  return forever(refresh)
}

main(Object.assign({ MQTT_ROOT: 'flux' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
