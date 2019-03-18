import mqtt from 'mqtt-bridge-utils'
import suncalc from 'suncalc'
import delay from 'delay'
import forever from 'p-forever'

const main = async (config) => {
  const {LATITUDE, LONGITUDE, POLL_INTERVAL = 5} = config
  const refresh = async () => {
    const time = new Date()
    const sunpos = suncalc.getPosition(time, Number(LATITUDE), Number(LONGITUDE))
    let azimuthDegrees = 180 + (sunpos.azimuth * 57.295779513)
    let altitudeDegrees = 180 + (sunpos.altitude * 57.295779513)
    mqpub('sun', Object.assign(
      suncalc.getTimes(time, Number(LATITUDE), Number(LONGITUDE)),
      sunpos,
      {azimuthDegrees, altitudeDegrees}
    ))
    const moonPos = suncalc.getMoonPosition(time, Number(LATITUDE), Number(LONGITUDE))
    azimuthDegrees = 180 + (moonPos.azimuth * 57.295779513)
    altitudeDegrees = 180 + (moonPos.altitude * 57.295779513)
    mqpub('moon', Object.assign(
      suncalc.getMoonIllumination(time),
      moonPos,
      suncalc.getMoonTimes(time, Number(LATITUDE), Number(LONGITUDE)),
      { altitudeDegrees, azimuthDegrees }
    ))
    await delay(POLL_INTERVAL * 1000)
  }
  const mqpub = await mqtt(config, async (id, command, payload) => {
    await refresh()
  })
  return forever(refresh)
}

main(Object.assign({ MQTT_ROOT: 'suncalc' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
