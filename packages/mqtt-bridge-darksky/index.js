import mqtt from 'mqtt-bridge-utils'
import fetch from 'make-fetch-happen'
import delay from 'delay'
import forever from 'p-forever'

const main = async (config) => {
  const {POLL_INTERVAL = 240, DARKSKY_KEY, LATITUDE, LONGITUDE} = config
  const url = `https://api.darksky.net/forecast/${DARKSKY_KEY}/${LATITUDE},${LONGITUDE}?units=si`
  const refresh = async () => {
    const {currently, minutely, hourly, daily, alerts} = await (await fetch(url, { retries: 3 })).json()
    mqpub('currently', currently)
    mqpub('minutely', minutely)
    mqpub('hourly', hourly)
    mqpub('daily', daily)
    for(const alert of alerts || []) {
      mqpub(`alert/${alert.time}`, alert)
    }
    await delay(POLL_INTERVAL * 1000)
  }
  const mqpub = await mqtt(config, async (id, command, payload) => {
    await refresh()
  })
  return forever(refresh) 
}

main(Object.assign({ MQTT_ROOT: 'darksky' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
